import { type Response, Router } from 'express';
import type { Logger } from 'pino';
import { type Actor, createActor } from '#server/actor.ts';
import {
  type CounterAction,
  type CounterMessage,
  CounterMessageType,
} from '#server/counterCore.ts';
import { LogLevel } from '#server/message.ts';
import { requireValue } from '#server/requireValue.ts';
import {
  initialWebAppCoreContext,
  type WebAppMessage,
  WebAppMessageType,
  WebAppShellMessageType,
  webAppStep,
} from '#server/webAppCore.ts';

export interface WebApp {
  readonly actor: Actor<WebAppMessage, Response>;
  readonly router: Router;
}

export function webAppActor(
  sendToCounter: (message: CounterMessage) => void,
  logger: Logger,
): WebApp {
  const connections = new Map<number, Response>();

  const actor = createActor({
    initial: initialWebAppCoreContext,
    step: webAppStep,
    interpret(outboundMessage, response: Response | undefined) {
      switch (outboundMessage.type) {
        case CounterMessageType.TickRequested:
        case CounterMessageType.HistoryRequested:
          sendToCounter(outboundMessage);
          return;

        case WebAppShellMessageType.Pong:
          requireResponse(response).json({ message: 'pong' });
          return;

        case WebAppShellMessageType.SubscriptionOpen:
          openSubscription(
            outboundMessage.subscriberId,
            requireResponse(response),
          );
          return;

        case WebAppShellMessageType.Write:
          writeActions(outboundMessage.subscriberId, outboundMessage.actions);
          return;

        case WebAppShellMessageType.SubscriptionClose:
          connections.delete(outboundMessage.subscriberId);
          return;
      }
    },
    logger,
  });

  function openSubscription(subscriberId: number, connection: Response): void {
    connection.on('close', () =>
      actor.send({
        type: WebAppMessageType.ConnectionClosed,
        logLevel: LogLevel.Debug,
        subscriberId,
      }),
    );
    connections.set(subscriberId, connection);
    connection.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
  }

  function writeActions(
    subscriberId: number,
    actions: readonly CounterAction[],
  ): void {
    const connection = connections.get(subscriberId);
    if (connection === undefined) {
      logger.error(
        { subscriberId },
        'a write found no connection for its subscriber',
      );
      return;
    }
    for (const action of actions) {
      connection.write(`data: ${JSON.stringify(action)}\n\n`);
    }
  }

  return { actor, router: webAppRouter(actor) };
}

function webAppRouter(actor: Actor<WebAppMessage, Response>): Router {
  const router = Router();
  router.get('/ping', (_request, response) => {
    actor.send(
      { type: WebAppMessageType.Ping, logLevel: LogLevel.Debug },
      response,
    );
  });
  router.get('/counter/events', (_request, response) => {
    actor.send(
      { type: WebAppMessageType.ConnectionRequested, logLevel: LogLevel.Debug },
      response,
    );
  });
  return router;
}

function requireResponse(response: Response | undefined): Response {
  return requireValue(response, 'the inbound message carries no response');
}
