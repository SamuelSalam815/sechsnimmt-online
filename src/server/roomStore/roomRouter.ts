import { randomUUID } from 'node:crypto';
import { type Response, Router } from 'express';
import type { Logger } from 'pino';
import { RequestType } from '#engine/requests/requestType.ts';
import { buildShuffledDeck } from '#engine/shuffledDeck.ts';
import {
  createRoomStore,
  type StreamEvent,
} from '#server/roomStore/roomStore.ts';
import {
  closeStream,
  expireGraceTimer,
  getReady,
  joinRoom,
  openStream,
  type PlayerRequestType,
  type RoomReply,
  requestPlayerChoice,
} from '#server/roomStore/roomThunks.ts';

// Long enough for a page reload or a short drop of the network.
const GRACE_PERIOD_MILLISECONDS = 30_000;

// The shell of one room: the HTTP routes, the open responses of the streams
// and the timers.
export function roomRouter(logger: Logger): Router {
  const streamResponses = new Map<number, Response>();
  let nextStreamId = 0;

  const store = createRoomStore({
    shuffleDeck: buildShuffledDeck,
    startGraceTimer(graceTimerId) {
      setTimeout(
        () => store.dispatch(expireGraceTimer(graceTimerId)),
        GRACE_PERIOD_MILLISECONDS,
      );
    },
    writeToStream: writeEvent,
    logger,
  });

  function writeEvent(streamId: number, streamEvent: StreamEvent): void {
    const stream = streamResponses.get(streamId);
    if (stream === undefined) {
      logger.error({ streamId }, 'a write found no open stream for its ID');
      return;
    }
    const data =
      streamEvent.eventName === 'gameActions'
        ? streamEvent.actions
        : streamEvent.roomView;
    stream.write(
      `event: ${streamEvent.eventName}\ndata: ${JSON.stringify(data)}\n\n`,
    );
  }

  function answer(response: Response, reply: RoomReply): void {
    if (reply.statusCode >= 400) {
      logger.info({ reply }, 'rejected');
    }
    if (reply.body === undefined) {
      response.status(reply.statusCode).end();
      return;
    }
    response.status(reply.statusCode).json(reply.body);
  }

  const router = Router();
  router.get('/ping', (_request, response) => {
    response.json({ message: 'pong' });
  });
  router.post('/room/join', (request, response) => {
    answer(response, store.dispatch(joinRoom(randomUUID(), request.body)));
  });
  router.post('/room/ready', (request, response) => {
    answer(response, store.dispatch(getReady(request.body)));
  });
  const playerRoutes: [string, PlayerRequestType][] = [
    ['/game/pick-card', RequestType.PickCard],
    ['/game/unpick-card', RequestType.UnpickCard],
    ['/game/pick-row', RequestType.PickRow],
  ];
  for (const [path, requestType] of playerRoutes) {
    router.post(path, (request, response) => {
      answer(
        response,
        store.dispatch(requestPlayerChoice(requestType, request.body)),
      );
    });
  }
  // An EventSource sends no body and no custom header, so the client token
  // travels in the query. The shell names the stream, because it holds the
  // response of the stream.
  router.get('/events', (request, response) => {
    const clientToken = request.query.clientToken;
    const streamId = nextStreamId++;
    streamResponses.set(streamId, response);
    response.on('close', () => {
      store.dispatch(closeStream(streamId));
      streamResponses.delete(streamId);
    });
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    store.dispatch(
      openStream(
        streamId,
        typeof clientToken === 'string' ? clientToken : undefined,
      ),
    );
  });
  return router;
}
