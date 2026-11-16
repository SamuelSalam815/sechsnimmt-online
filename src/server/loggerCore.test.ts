import { describe, expect, test } from 'vitest';
import { initialLoggerCoreContext, loggerStep } from '#server/loggerCore.ts';

describe('loggerStep', () => {
  test('logs an HTTP request', () => {
    expect(
      loggerStep(initialLoggerCoreContext, {
        type: 'logger/httpRequest',
        method: 'GET',
        url: '/api/ping',
      }),
    ).toEqual({
      coreContext: initialLoggerCoreContext,
      outboundMessages: [
        {
          type: 'shell/log',
          fields: { method: 'GET', url: '/api/ping' },
          text: 'request',
        },
      ],
    });
  });

  test('counts a subscriber that the web app accepts', () => {
    expect(
      loggerStep(
        { subscribers: 1 },
        {
          type: 'logger/stepped',
          inboundMessage: { type: 'webApp/requestSubscription' },
          outboundMessages: [
            { type: 'shell/subscriptionOpen', subscriberId: 4 },
            { type: 'counter/historyRequested', subscriberId: 4 },
          ],
        },
      ),
    ).toEqual({
      coreContext: { subscribers: 2 },
      outboundMessages: [
        {
          type: 'shell/log',
          fields: { subscriberId: 4, subscribers: 2 },
          text: 'subscriber joined',
        },
      ],
    });
  });

  test('counts down a subscriber that the web app releases', () => {
    expect(
      loggerStep(
        { subscribers: 2 },
        {
          type: 'logger/stepped',
          inboundMessage: {
            type: 'webApp/connectionClosed',
            subscriberId: 4,
          },
          outboundMessages: [
            { type: 'shell/subscriptionClose', subscriberId: 4 },
          ],
        },
      ),
    ).toEqual({
      coreContext: { subscribers: 1 },
      outboundMessages: [
        {
          type: 'shell/log',
          fields: { subscriberId: 4, subscribers: 1 },
          text: 'subscriber left',
        },
      ],
    });
  });

  test('logs a counter advance with the subscriber count', () => {
    const coreContext = { subscribers: 3 };
    expect(
      loggerStep(coreContext, {
        type: 'logger/stepped',
        inboundMessage: { type: 'counter/tick' },
        outboundMessages: [
          {
            type: 'webApp/fanOutAction',
            action: { type: 'counter/advanced', value: 7 },
          },
        ],
      }),
    ).toEqual({
      coreContext,
      outboundMessages: [
        {
          type: 'shell/log',
          fields: { counter: 7, subscribers: 3 },
          text: 'counter advanced',
        },
      ],
    });
  });

  test('logs nothing for a step that carries no event worth a log', () => {
    expect(
      loggerStep(initialLoggerCoreContext, {
        type: 'logger/stepped',
        inboundMessage: { type: 'webApp/ping' },
        outboundMessages: [{ type: 'shell/pong' }],
      }),
    ).toEqual({ coreContext: initialLoggerCoreContext, outboundMessages: [] });
  });
});
