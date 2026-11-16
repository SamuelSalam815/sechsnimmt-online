import { describe, expect, test } from 'vitest';
import type { CounterAdvanced } from '#server/counterCore.ts';
import { LogLevel } from '#server/message.ts';
import {
  initialWebAppCoreContext,
  type WebAppCoreContext,
  webAppStep,
} from '#server/webAppCore.ts';

const one: CounterAdvanced = { type: 'counter/advanced', value: 1 };
const two: CounterAdvanced = { type: 'counter/advanced', value: 2 };

function coreContextWith(
  subscribers: [number, 'pending' | 'active'][],
): WebAppCoreContext {
  return { nextSubscriberId: 5, subscribers: new Map(subscribers) };
}

describe('webAppStep', () => {
  test('a ping gets a pong', () => {
    expect(
      webAppStep(initialWebAppCoreContext, {
        type: 'webApp/ping',
        logLevel: LogLevel.Debug,
      }),
    ).toEqual({
      coreContext: initialWebAppCoreContext,
      outboundMessages: [{ type: 'shell/pong', logLevel: LogLevel.Debug }],
    });
  });

  test('a subscription request accepts a pending subscriber under the next ID and asks the counter for its history', () => {
    expect(
      webAppStep(coreContextWith([]), {
        type: 'webApp/requestSubscription',
        logLevel: LogLevel.Debug,
      }),
    ).toEqual({
      coreContext: {
        nextSubscriberId: 6,
        subscribers: new Map([[5, 'pending']]),
      },
      outboundMessages: [
        {
          type: 'shell/subscriptionOpen',
          logLevel: LogLevel.Info,
          subscriberId: 5,
        },
        {
          type: 'counter/historyRequested',
          logLevel: LogLevel.Debug,
          subscriberId: 5,
        },
      ],
    });
  });

  test('a delivered history activates the subscriber and writes the history to it', () => {
    expect(
      webAppStep(coreContextWith([[1, 'pending']]), {
        type: 'webApp/historyDelivered',
        logLevel: LogLevel.Debug,
        subscriberId: 1,
        history: [one, two],
      }),
    ).toEqual({
      coreContext: coreContextWith([[1, 'active']]),
      outboundMessages: [
        {
          type: 'shell/write',
          logLevel: LogLevel.Debug,
          subscriberId: 1,
          actions: [one, two],
        },
      ],
    });
  });

  test('a history for a subscriber that has closed changes nothing', () => {
    const coreContext = coreContextWith([]);
    expect(
      webAppStep(coreContext, {
        type: 'webApp/historyDelivered',
        logLevel: LogLevel.Debug,
        subscriberId: 1,
        history: [one],
      }),
    ).toEqual({ coreContext, outboundMessages: [] });
  });

  test('a fanned out action goes to the active subscribers only', () => {
    const coreContext = coreContextWith([
      [1, 'active'],
      [2, 'pending'],
      [3, 'active'],
    ]);
    expect(
      webAppStep(coreContext, {
        type: 'webApp/fanOutAction',
        logLevel: LogLevel.Info,
        action: two,
      }),
    ).toEqual({
      coreContext,
      outboundMessages: [
        {
          type: 'shell/write',
          logLevel: LogLevel.Debug,
          subscriberId: 1,
          actions: [two],
        },
        {
          type: 'shell/write',
          logLevel: LogLevel.Debug,
          subscriberId: 3,
          actions: [two],
        },
      ],
    });
  });

  test('a closed connection removes the subscriber and releases it', () => {
    expect(
      webAppStep(
        coreContextWith([
          [1, 'active'],
          [2, 'pending'],
        ]),
        {
          type: 'webApp/connectionClosed',
          logLevel: LogLevel.Debug,
          subscriberId: 1,
        },
      ),
    ).toEqual({
      coreContext: coreContextWith([[2, 'pending']]),
      outboundMessages: [
        {
          type: 'shell/subscriptionClose',
          logLevel: LogLevel.Info,
          subscriberId: 1,
        },
      ],
    });
  });

  test('a second close of the same connection changes nothing', () => {
    const coreContext = coreContextWith([]);
    expect(
      webAppStep(coreContext, {
        type: 'webApp/connectionClosed',
        logLevel: LogLevel.Debug,
        subscriberId: 1,
      }),
    ).toEqual({ coreContext, outboundMessages: [] });
  });
});
