import { describe, expect, test } from 'vitest';
import { type CounterAction, CounterMessageType } from '#server/counterCore.ts';
import { LogLevel } from '#server/message.ts';
import {
  initialWebAppCoreContext,
  type WebAppCoreContext,
  WebAppMessageType,
  WebAppShellMessageType,
  webAppStep,
} from '#server/webAppCore.ts';

const one: CounterAction = { type: 'counter/tick', totalCount: 1 };
const two: CounterAction = { type: 'counter/tick', totalCount: 2 };

function coreContextWith(
  subscribers: [number, 'pending' | 'active'][],
): WebAppCoreContext {
  return { nextSubscriberId: 5, subscribers: new Map(subscribers) };
}

describe('webAppStep', () => {
  test('a ping gets a pong', () => {
    expect(
      webAppStep(initialWebAppCoreContext, {
        type: WebAppMessageType.Ping,
        logLevel: LogLevel.Debug,
      }),
    ).toEqual({
      coreContext: initialWebAppCoreContext,
      outboundMessages: [
        { type: WebAppShellMessageType.Pong, logLevel: LogLevel.Debug },
      ],
    });
  });

  test('a connection request accepts a pending subscriber under the next ID and asks the counter for its history', () => {
    expect(
      webAppStep(coreContextWith([]), {
        type: WebAppMessageType.ConnectionRequested,
        logLevel: LogLevel.Debug,
      }),
    ).toEqual({
      coreContext: {
        nextSubscriberId: 6,
        subscribers: new Map([[5, 'pending']]),
      },
      outboundMessages: [
        {
          type: WebAppShellMessageType.SubscriptionOpen,
          logLevel: LogLevel.Info,
          subscriberId: 5,
        },
        {
          type: CounterMessageType.HistoryRequested,
          logLevel: LogLevel.Debug,
          subscriberId: 5,
        },
      ],
    });
  });

  test('a history response activates the subscriber and writes the history to it', () => {
    expect(
      webAppStep(coreContextWith([[1, 'pending']]), {
        type: WebAppMessageType.HistoryResponse,
        logLevel: LogLevel.Debug,
        subscriberId: 1,
        history: [one, two],
      }),
    ).toEqual({
      coreContext: coreContextWith([[1, 'active']]),
      outboundMessages: [
        {
          type: WebAppShellMessageType.Write,
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
        type: WebAppMessageType.HistoryResponse,
        logLevel: LogLevel.Debug,
        subscriberId: 1,
        history: [one],
      }),
    ).toEqual({ coreContext, outboundMessages: [] });
  });

  test('a broadcast action goes to the active subscribers only', () => {
    const coreContext = coreContextWith([
      [1, 'active'],
      [2, 'pending'],
      [3, 'active'],
    ]);
    expect(
      webAppStep(coreContext, {
        type: WebAppMessageType.BroadcastAction,
        logLevel: LogLevel.Info,
        action: two,
      }),
    ).toEqual({
      coreContext,
      outboundMessages: [
        {
          type: WebAppShellMessageType.Write,
          logLevel: LogLevel.Debug,
          subscriberId: 1,
          actions: [two],
        },
        {
          type: WebAppShellMessageType.Write,
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
          type: WebAppMessageType.ConnectionClosed,
          logLevel: LogLevel.Debug,
          subscriberId: 1,
        },
      ),
    ).toEqual({
      coreContext: coreContextWith([[2, 'pending']]),
      outboundMessages: [
        {
          type: WebAppShellMessageType.SubscriptionClose,
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
        type: WebAppMessageType.ConnectionClosed,
        logLevel: LogLevel.Debug,
        subscriberId: 1,
      }),
    ).toEqual({ coreContext, outboundMessages: [] });
  });
});
