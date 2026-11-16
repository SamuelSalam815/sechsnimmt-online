import type { NextFunction, Request, Response } from 'express';
import pino, { type Logger } from 'pino';
import { type Actor, createActor } from '#server/actor.ts';
import {
  initialLoggerCoreContext,
  type LoggerMessage,
  loggerStep,
} from '#server/loggerCore.ts';

export function productionLogger(): Logger {
  return pino();
}

export function developmentLogger(): Logger {
  return pino({ transport: { target: 'pino-pretty' } });
}

export function loggerActor(logger: Logger): Actor<LoggerMessage> {
  return createActor({
    initial: initialLoggerCoreContext,
    step: loggerStep,
    interpret: (outboundMessage) =>
      logger.info(outboundMessage.fields, outboundMessage.text),
  });
}

export function logRequests(logger: Actor<LoggerMessage>) {
  return (request: Request, _response: Response, next: NextFunction) => {
    logger.send({
      type: 'logger/httpRequest',
      method: request.method,
      url: request.url,
    });
    next();
  };
}
