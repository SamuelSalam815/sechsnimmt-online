import pino, { type Logger } from 'pino';

export function productionLogger(): Logger {
  return pino();
}

export function developmentLogger(): Logger {
  return pino({ transport: { target: 'pino-pretty' } });
}
