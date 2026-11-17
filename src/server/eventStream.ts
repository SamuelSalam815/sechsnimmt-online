import { type Response, Router } from 'express';
import type { Logger } from 'pino';
import { type Actor, createActor } from '#server/actor.ts';
import {
  type EventStreamMessage,
  EventStreamMessageType,
  EventStreamShellMessageType,
  eventStreamStep,
  initialEventStreamCoreContext,
  type StreamEvent,
} from '#server/eventStreamCore.ts';
import {
  type GameRunnerMessage,
  GameRunnerMessageType,
} from '#server/gameRunnerCore.ts';
import { LogLevel } from '#server/message.ts';
import { requireValue } from '#server/requireValue.ts';
import { type RoomMessage, RoomMessageType } from '#server/roomCore.ts';

export interface EventStream {
  readonly actor: Actor<EventStreamMessage, Response>;
  readonly router: Router;
}

export function eventStreamActor(
  sendToGameRunner: (message: GameRunnerMessage) => void,
  sendToRoom: (message: RoomMessage) => void,
  logger: Logger,
): EventStream {
  const streams = new Map<number, Response>();

  const actor = createActor({
    initial: initialEventStreamCoreContext,
    step: eventStreamStep,
    interpret(outboundMessage, response: Response | undefined) {
      switch (outboundMessage.type) {
        case GameRunnerMessageType.HistoryRequested:
          sendToGameRunner(outboundMessage);
          return;

        case RoomMessageType.StreamOpened:
        case RoomMessageType.StreamClosed:
          sendToRoom(outboundMessage);
          return;

        case EventStreamShellMessageType.StreamOpen:
          openStream(
            outboundMessage.streamId,
            requireValue(response, 'the inbound message carries no response'),
          );
          return;

        case EventStreamShellMessageType.StreamWrite:
          writeEvent(outboundMessage.streamId, outboundMessage.streamEvent);
          return;

        case EventStreamShellMessageType.StreamClose:
          streams.delete(outboundMessage.streamId);
          return;
      }
    },
    actorId: 'eventStream',
    logger,
  });

  function openStream(streamId: number, stream: Response): void {
    stream.on('close', () =>
      actor.send({
        type: EventStreamMessageType.StreamClosed,
        logLevel: LogLevel.Debug,
        streamId,
      }),
    );
    streams.set(streamId, stream);
    stream.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
  }

  function writeEvent(streamId: number, streamEvent: StreamEvent): void {
    const stream = streams.get(streamId);
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

  const router = Router();
  // An EventSource sends no body and no custom header, so the client token
  // travels in the query.
  router.get('/events', (request, response) => {
    const clientToken = request.query.clientToken;
    actor.send(
      {
        type: EventStreamMessageType.StreamRequested,
        logLevel: LogLevel.Debug,
        clientToken: typeof clientToken === 'string' ? clientToken : undefined,
      },
      response,
    );
  });
  return { actor, router };
}
