import { describe, expect, test } from 'vitest';
import type { CounterAdvanced } from '#server/counterCore.ts';
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
      webAppStep(initialWebAppCoreContext, { type: 'webApp/ping' }),
    ).toEqual({
      coreContext: initialWebAppCoreContext,
      outboundMessages: [{ type: 'webAppShell/pong' }],
    });
  });

  test('a subscription request accepts a pending subscriber under the next ID and asks the counter for its history', () => {
    expect(
      webAppStep(coreContextWith([]), { type: 'webApp/requestSubscription' }),
    ).toEqual({
      coreContext: {
        nextSubscriberId: 6,
        subscribers: new Map([[5, 'pending']]),
      },
      outboundMessages: [
        { type: 'webAppShell/accept', subscriberId: 5 },
        { type: 'counter/historyRequested', subscriberId: 5 },
      ],
    });
  });

  test('a delivered history activates the subscriber and writes the history to it', () => {
    expect(
      webAppStep(coreContextWith([[1, 'pending']]), {
        type: 'webApp/historyDelivered',
        subscriberId: 1,
        history: [one, two],
      }),
    ).toEqual({
      coreContext: coreContextWith([[1, 'active']]),
      outboundMessages: [
        { type: 'webAppShell/write', subscriberId: 1, actions: [one, two] },
      ],
    });
  });

  test('a history for a subscriber that has closed changes nothing', () => {
    const coreContext = coreContextWith([]);
    expect(
      webAppStep(coreContext, {
        type: 'webApp/historyDelivered',
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
      webAppStep(coreContext, { type: 'webApp/fanOutAction', action: two }),
    ).toEqual({
      coreContext,
      outboundMessages: [
        { type: 'webAppShell/write', subscriberId: 1, actions: [two] },
        { type: 'webAppShell/write', subscriberId: 3, actions: [two] },
      ],
    });
  });

  test('a closed subscription removes the subscriber and releases it', () => {
    expect(
      webAppStep(
        coreContextWith([
          [1, 'active'],
          [2, 'pending'],
        ]),
        { type: 'webApp/subscriptionClosed', subscriberId: 1 },
      ),
    ).toEqual({
      coreContext: coreContextWith([[2, 'pending']]),
      outboundMessages: [{ type: 'webAppShell/release', subscriberId: 1 }],
    });
  });

  test('a second close of the same subscription changes nothing', () => {
    const coreContext = coreContextWith([]);
    expect(
      webAppStep(coreContext, {
        type: 'webApp/subscriptionClosed',
        subscriberId: 1,
      }),
    ).toEqual({ coreContext, outboundMessages: [] });
  });
});
