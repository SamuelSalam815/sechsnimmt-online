import type { NextFunction, Request, Response } from 'express';
import pino, { type Logger } from 'pino';

export type { Logger };

export function productionLogger(): Logger {
  return pino();
}

export function developmentLogger(): Logger {
  return pino({ transport: { target: 'pino-pretty' } });
}

export function logRequests(logger: Logger) {
  return (request: Request, _response: Response, next: NextFunction) => {
    logger.info({ method: request.method, url: request.url }, 'request');
    next();
  };
}
