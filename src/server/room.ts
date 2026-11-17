import { randomUUID } from 'node:crypto';
import { type Response, Router } from 'express';
import type { Logger } from 'pino';
import { type Actor, createActor } from '#server/actor.ts';
import {
  type EventStreamMessage,
  EventStreamMessageType,
} from '#server/eventStreamCore.ts';
import {
  type GameRunnerMessage,
  GameRunnerMessageType,
} from '#server/gameRunnerCore.ts';
import { LogLevel } from '#server/message.ts';
import { requireValue } from '#server/requireValue.ts';
import {
  initialRoomCoreContext,
  type RoomMessage,
  RoomMessageType,
  RoomShellMessageType,
  roomStep,
} from '#server/roomCore.ts';

// Long enough for a page reload or a short drop of the network.
const GRACE_PERIOD_MILLISECONDS = 30_000;

export interface Room {
  readonly actor: Actor<RoomMessage, Response>;
  readonly router: Router;
}

export function roomActor(
  sendToEventStream: (message: EventStreamMessage) => void,
  sendToGameRunner: (message: GameRunnerMessage) => void,
  logger: Logger,
): Room {
  const actor: Actor<RoomMessage, Response> = createActor({
    initial: initialRoomCoreContext,
    step: roomStep,
    interpret(outboundMessage, response: Response | undefined) {
      switch (outboundMessage.type) {
        case EventStreamMessageType.StreamRequested:
        case EventStreamMessageType.HistoryResponse:
        case EventStreamMessageType.BroadcastActions:
        case EventStreamMessageType.BroadcastRoomView:
        case EventStreamMessageType.StreamClosed:
          sendToEventStream(outboundMessage);
          return;

        case GameRunnerMessageType.GameStartRequested:
        case GameRunnerMessageType.DeckShuffled:
        case GameRunnerMessageType.PlayerRequested:
        case GameRunnerMessageType.HistoryRequested:
          sendToGameRunner(outboundMessage);
          return;

        case RoomShellMessageType.JoinAccepted:
          requireValue(
            response,
            'the inbound message carries no response',
          ).json({
            clientToken: outboundMessage.clientToken,
            playerId: outboundMessage.playerId,
          });
          return;

        case RoomShellMessageType.ReadyAccepted:
          requireValue(response, 'the inbound message carries no response')
            .status(204)
            .end();
          return;

        case RoomShellMessageType.RequestRejected:
          requireValue(response, 'the inbound message carries no response')
            .status(outboundMessage.statusCode)
            .json({ message: outboundMessage.message });
          return;

        case RoomShellMessageType.GraceTimerStart: {
          const { graceTimerId } = outboundMessage;
          setTimeout(
            () =>
              actor.send({
                type: RoomMessageType.GraceTimerExpired,
                logLevel: LogLevel.Debug,
                graceTimerId,
              }),
            GRACE_PERIOD_MILLISECONDS,
          );
          return;
        }
      }
    },
    actorId: 'room',
    logger,
  });

  const router = Router();
  router.post('/room/join', (request, response) => {
    actor.send(
      {
        type: RoomMessageType.JoinRequested,
        logLevel: LogLevel.Debug,
        clientToken: randomUUID(),
        requestBody: request.body,
      },
      response,
    );
  });
  router.post('/room/ready', (request, response) => {
    actor.send(
      {
        type: RoomMessageType.ReadyRequested,
        logLevel: LogLevel.Debug,
        requestBody: request.body,
      },
      response,
    );
  });
  return { actor, router };
}
