import { type Response, Router } from 'express';
import { type Actor, createActor } from '#server/actor.ts';
import type { CounterMessage } from '#server/counterCore.ts';
import type { LoggerMessage } from '#server/loggerCore.ts';
import {
  initialWebAppCoreContext,
  type WebAppMessage,
  webAppStep,
} from '#server/webAppCore.ts';

export interface WebApp {
  readonly actor: Actor<WebAppMessage, Response>;
  readonly router: Router;
}

export function webAppActor(
  sendToCounter: (message: CounterMessage) => void,
  logger: Actor<LoggerMessage>,
): WebApp {
  const connections = new Map<number, Response>();

  function connectionOf(subscriberId: number): Response {
    const connection = connections.get(subscriberId);
    if (connection === undefined) {
      throw new Error(`subscriber ${subscriberId} has no connection`);
    }
    return connection;
  }

  const actor = createActor({
    initial: initialWebAppCoreContext,
    step: webAppStep,
    interpret(outboundMessage, response: Response | undefined) {
      switch (outboundMessage.type) {
        case 'counter/tick':
        case 'counter/historyRequested':
          sendToCounter(outboundMessage);
          return;

        case 'shell/pong':
          requireResponse(response).json({ message: 'pong' });
          return;

        case 'shell/subscriptionOpen': {
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
            actor.send({ type: 'webApp/connectionClosed', subscriberId }),
          );
          return;
        }

        case 'shell/write': {
          const connection = connectionOf(outboundMessage.subscriberId);
          for (const action of outboundMessage.actions) {
            connection.write(`data: ${JSON.stringify(action)}\n\n`);
          }
          return;
        }

        case 'shell/subscriptionClose':
          connections.delete(outboundMessage.subscriberId);
          return;
      }
    },
    observe: (inboundMessage, outboundMessages) =>
      logger.send({ type: 'logger/stepped', inboundMessage, outboundMessages }),
  });

  const router = Router();
  router.get('/ping', (_request, response) => {
    actor.send({ type: 'webApp/ping' }, response);
  });
  router.get('/counter/events', (_request, response) => {
    actor.send({ type: 'webApp/requestSubscription' }, response);
  });

  return { actor, router };
}

function requireResponse(response: Response | undefined): Response {
  if (response === undefined) {
    throw new Error('the inbound message carries no response');
  }
  return response;
}
