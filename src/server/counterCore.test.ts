import { describe, expect, test } from 'vitest';
import {
  type CounterAdvanced,
  counterStep,
  counterValue,
  initialCounterCoreContext,
} from '#server/counterCore.ts';
import { LogLevel } from '#server/message.ts';

const one: CounterAdvanced = { type: 'counter/advanced', value: 1 };
const two: CounterAdvanced = { type: 'counter/advanced', value: 2 };

describe('counterValue', () => {
  test('is zero before the first advance', () => {
    expect(counterValue([])).toBe(0);
  });

  test('is the value of the last advance', () => {
    expect(counterValue([one, two])).toBe(2);
  });
});

describe('counterStep', () => {
  test('a tick appends the next advance and fans it out', () => {
    expect(
      counterStep(
        { history: [one] },
        { type: 'counter/tick', logLevel: LogLevel.Debug },
      ),
    ).toEqual({
      coreContext: { history: [one, two] },
      outboundMessages: [
        { type: 'webApp/fanOutAction', logLevel: LogLevel.Info, action: two },
      ],
    });
  });

  test('the first tick advances to one', () => {
    expect(
      counterStep(initialCounterCoreContext, {
        type: 'counter/tick',
        logLevel: LogLevel.Debug,
      }).coreContext,
    ).toEqual({ history: [one] });
  });

  test('a history request delivers the full history to the subscriber', () => {
    const coreContext = { history: [one, two] };
    expect(
      counterStep(coreContext, {
        type: 'counter/historyRequested',
        logLevel: LogLevel.Debug,
        subscriberId: 3,
      }),
    ).toEqual({
      coreContext,
      outboundMessages: [
        {
          type: 'webApp/historyDelivered',
          logLevel: LogLevel.Debug,
          subscriberId: 3,
          history: [one, two],
        },
      ],
    });
  });
});
