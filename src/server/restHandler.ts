import { type Response, Router } from 'express';
import type { Logger } from 'pino';
import { createActor } from '#server/actor.ts';
import { LogLevel } from '#server/message.ts';
import { requireValue } from '#server/requireValue.ts';
import {
  initialRestHandlerCoreContext,
  RestHandlerMessageType,
  RestHandlerShellMessageType,
  restHandlerStep,
} from '#server/restHandlerCore.ts';

export function restHandlerRouter(logger: Logger): Router {
  const actor = createActor({
    initial: initialRestHandlerCoreContext,
    step: restHandlerStep,
    interpret(outboundMessage, response: Response | undefined) {
      switch (outboundMessage.type) {
        case RestHandlerShellMessageType.Pong:
          requireValue(
            response,
            'the inbound message carries no response',
          ).json({ message: 'pong' });
          return;
      }
    },
    actorId: 'restHandler',
    logger,
  });

  const router = Router();
  router.get('/ping', (_request, response) => {
    actor.sendFromOutside(
      { type: RestHandlerMessageType.Ping, logLevel: LogLevel.Debug },
      response,
    );
  });
  return router;
}
