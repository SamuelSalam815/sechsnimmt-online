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
  const streams = new Map<number, Response>();

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

        case WebAppShellMessageType.StreamOpen:
          openStream(outboundMessage.streamId, requireResponse(response));
          return;

        case WebAppShellMessageType.StreamWrite:
          writeActions(outboundMessage.streamId, outboundMessage.actions);
          return;

        case WebAppShellMessageType.StreamClose:
          streams.delete(outboundMessage.streamId);
          return;
      }
    },
    logger,
  });

  function openStream(streamId: number, stream: Response): void {
    stream.on('close', () =>
      actor.send({
        type: WebAppMessageType.StreamClosed,
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

  function writeActions(
    streamId: number,
    actions: readonly CounterAction[],
  ): void {
    const stream = streams.get(streamId);
    if (stream === undefined) {
      logger.error({ streamId }, 'a write found no open stream for its ID');
      return;
    }
    stream.write(`data: ${JSON.stringify(actions)}\n\n`);
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
      { type: WebAppMessageType.StreamRequested, logLevel: LogLevel.Debug },
      response,
    );
  });
  return router;
}

function requireResponse(response: Response | undefined): Response {
  return requireValue(response, 'the inbound message carries no response');
}
