import { describe, expect, test } from 'vitest';
import { LogLevel } from '#server/infrastructure/message.ts';
import {
  initialRestHandlerCoreContext,
  RestHandlerMessageType,
  RestHandlerShellMessageType,
  restHandlerStep,
} from '#server/restHandler/restHandlerCore.ts';

describe('restHandlerStep', () => {
  test('a ping gets a pong', () => {
    expect(
      restHandlerStep(initialRestHandlerCoreContext, {
        type: RestHandlerMessageType.Ping,
        logLevel: LogLevel.Debug,
      }),
    ).toEqual({
      coreContext: initialRestHandlerCoreContext,
      outboundMessages: [
        { type: RestHandlerShellMessageType.Pong, logLevel: LogLevel.Debug },
      ],
    });
  });
});
