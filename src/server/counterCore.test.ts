import { describe, expect, test } from 'vitest';
import {
  type CounterAction,
  CounterMessageType,
  counterStep,
  counterValue,
  initialCounterCoreContext,
} from '#server/counterCore.ts';
import { LogLevel } from '#server/message.ts';
import { WebAppMessageType } from '#server/webAppCore.ts';

const one: CounterAction = { type: 'counter/tick', totalCount: 1 };
const two: CounterAction = { type: 'counter/tick', totalCount: 2 };

describe('counterValue', () => {
  test('is zero before the first advance', () => {
    expect(counterValue([])).toBe(0);
  });

  test('is the value of the last advance', () => {
    expect(counterValue([one, two])).toBe(2);
  });
});

describe('counterStep', () => {
  test('a tick request appends the next tick and broadcasts it', () => {
    expect(
      counterStep(
        { history: [one] },
        { type: CounterMessageType.TickRequested, logLevel: LogLevel.Debug },
      ),
    ).toEqual({
      coreContext: { history: [one, two] },
      outboundMessages: [
        {
          type: WebAppMessageType.BroadcastAction,
          logLevel: LogLevel.Info,
          action: two,
        },
      ],
    });
  });

  test('the first tick request counts to one', () => {
    expect(
      counterStep(initialCounterCoreContext, {
        type: CounterMessageType.TickRequested,
        logLevel: LogLevel.Debug,
      }).coreContext,
    ).toEqual({ history: [one] });
  });

  test('a history request delivers the full history to the requesting stream', () => {
    const coreContext = { history: [one, two] };
    expect(
      counterStep(coreContext, {
        type: CounterMessageType.HistoryRequested,
        logLevel: LogLevel.Debug,
        streamId: 3,
      }),
    ).toEqual({
      coreContext,
      outboundMessages: [
        {
          type: WebAppMessageType.HistoryResponse,
          logLevel: LogLevel.Debug,
          streamId: 3,
          history: [one, two],
        },
      ],
    });
  });
});
