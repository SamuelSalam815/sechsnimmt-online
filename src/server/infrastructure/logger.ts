import type { Middleware } from '@reduxjs/toolkit';
import pino, { type Logger } from 'pino';

export function productionLogger(): Logger {
  return pino();
}

export function developmentLogger(): Logger {
  return pino({ transport: { target: 'pino-pretty' } });
}

export const REDACTED_CLIENT_TOKEN = '[redacted]';

// By the field name and at any depth, so that a new message with a client token
// needs no change here. A request body is untrusted, so a client token can be
// at any place in it.
export function withClientTokensRedacted(
  value: object,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([fieldName, fieldValue]) => [
      fieldName,
      fieldName === 'clientToken' && fieldValue !== undefined
        ? REDACTED_CLIENT_TOKEN
        : withNestedClientTokensRedacted(fieldValue),
    ]),
  );
}

function withNestedClientTokensRedacted(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withNestedClientTokensRedacted);
  }
  if (typeof value === 'object' && value !== null) {
    return withClientTokensRedacted(value);
  }
  return value;
}

// Logs each action whole, with its client tokens redacted. The store reduces
// the action as it came.
export function actionLoggingMiddleware(
  logger: Logger,
  logsAtDebugLevel: (actionType: string) => boolean,
): Middleware {
  return () => (next) => (action) => {
    if (typeof action === 'object' && action !== null && 'type' in action) {
      const logEntry = withClientTokensRedacted(action);
      if (logsAtDebugLevel(String(action.type))) {
        logger.debug(logEntry, 'dispatched');
      } else {
        logger.info(logEntry, 'dispatched');
      }
    }
    return next(action);
  };
}
