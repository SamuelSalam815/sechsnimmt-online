import { type Response, Router } from 'express';
import type { Logger } from 'pino';
import { type Actor, createActor } from '#server/actor.ts';
import {
  type CounterMessage,
  CounterMessageType,
} from '#server/counterCore.ts';
import { LogLevel } from '#server/message.ts';
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

        case WebAppShellMessageType.SubscriptionOpen: {
          const { subscriberId } = outboundMessage;
          const connection = requireResponse(response);
          connection.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });
          connections.set(subscriberId, connection);
          // The acceptance runs in a microtask of the task that received the
          // request. A close needs the event loop, so it cannot fire before
          // this listener exists.
          connection.on('close', () =>
            actor.send({
              type: WebAppMessageType.ConnectionClosed,
              logLevel: LogLevel.Debug,
              subscriberId,
            }),
          );
          return;
        }

        case WebAppShellMessageType.Write: {
          const { subscriberId } = outboundMessage;
          const connection = connections.get(subscriberId);
          if (connection === undefined) {
            logger.error(
              { subscriberId },
              'a write found no connection for its subscriber',
            );
            return;
          }
          for (const action of outboundMessage.actions) {
            connection.write(`data: ${JSON.stringify(action)}\n\n`);
          }
          return;
        }

        case WebAppShellMessageType.SubscriptionClose:
          connections.delete(outboundMessage.subscriberId);
          return;
      }
    },
    logger,
  });

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

  return { actor, router };
}

function requireResponse(response: Response | undefined): Response {
  if (response === undefined) {
    throw new Error('the inbound message carries no response');
  }
  return response;
}
