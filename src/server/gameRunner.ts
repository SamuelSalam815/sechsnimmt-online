import { type Response, Router } from 'express';
import type { Logger } from 'pino';
import { RequestType } from '#engine/requests/requestType.ts';
import { buildShuffledDeck } from '#engine/shuffledDeck.ts';
import { type Actor, createActor } from '#server/actor.ts';
import type { EventStreamMessage } from '#server/eventStreamCore.ts';
import { EventStreamMessageType } from '#server/eventStreamCore.ts';
import {
  type GameRunnerMessage,
  GameRunnerMessageType,
  GameRunnerShellMessageType,
  gameRunnerStep,
  initialGameRunnerCoreContext,
  type PlayerRequestType,
} from '#server/gameRunnerCore.ts';
import { LogLevel } from '#server/message.ts';
import { requireValue } from '#server/requireValue.ts';

export interface GameRunner {
  readonly actor: Actor<GameRunnerMessage, Response>;
  readonly router: Router;
}

export function gameRunnerActor(
  sendToEventStream: (message: EventStreamMessage) => void,
  logger: Logger,
): GameRunner {
  const actor: Actor<GameRunnerMessage, Response> = createActor({
    initial: initialGameRunnerCoreContext,
    step: gameRunnerStep,
    interpret(outboundMessage, response: Response | undefined) {
      switch (outboundMessage.type) {
        case EventStreamMessageType.StreamRequested:
        case EventStreamMessageType.HistoryResponse:
        case EventStreamMessageType.BroadcastActions:
        case EventStreamMessageType.BroadcastRoomView:
        case EventStreamMessageType.StreamClosed:
          sendToEventStream(outboundMessage);
          return;

        case GameRunnerShellMessageType.ShuffleRequested:
          actor.send({
            type: GameRunnerMessageType.DeckShuffled,
            logLevel: LogLevel.Debug,
            deck: buildShuffledDeck(),
          });
          return;

        case GameRunnerShellMessageType.RequestAccepted:
          requireValue(response, 'the inbound message carries no response')
            .status(204)
            .end();
          return;

        case GameRunnerShellMessageType.RequestRejected:
          requireValue(response, 'the inbound message carries no response')
            .status(outboundMessage.statusCode)
            .json({ message: outboundMessage.message });
          return;
      }
    },
    actorId: 'gameRunner',
    logger,
  });

  const router = Router();
  const routes: [string, PlayerRequestType][] = [
    ['/game/pick-card', RequestType.PickCard],
    ['/game/unpick-card', RequestType.UnpickCard],
    ['/game/pick-row', RequestType.PickRow],
  ];
  for (const [path, requestType] of routes) {
    router.post(path, (request, response) => {
      actor.send(
        {
          type: GameRunnerMessageType.PlayerRequested,
          logLevel: LogLevel.Debug,
          requestType,
          requestBody: request.body,
        },
        response,
      );
    });
  }
  return { actor, router };
}
