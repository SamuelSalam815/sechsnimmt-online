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
  streams: [number, 'pending' | 'active'][],
): WebAppCoreContext {
  return { nextStreamId: 5, streams: new Map(streams) };
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

  test('a stream request accepts a pending stream under the next ID and asks the counter for its history', () => {
    expect(
      webAppStep(coreContextWith([]), {
        type: WebAppMessageType.StreamRequested,
        logLevel: LogLevel.Debug,
      }),
    ).toEqual({
      coreContext: {
        nextStreamId: 6,
        streams: new Map([[5, 'pending']]),
      },
      outboundMessages: [
        {
          type: WebAppShellMessageType.StreamOpen,
          logLevel: LogLevel.Info,
          streamId: 5,
        },
        {
          type: CounterMessageType.HistoryRequested,
          logLevel: LogLevel.Debug,
          streamId: 5,
        },
      ],
    });
  });

  test('a history response activates the stream and writes the history to it', () => {
    expect(
      webAppStep(coreContextWith([[1, 'pending']]), {
        type: WebAppMessageType.HistoryResponse,
        logLevel: LogLevel.Debug,
        streamId: 1,
        history: [one, two],
      }),
    ).toEqual({
      coreContext: coreContextWith([[1, 'active']]),
      outboundMessages: [
        {
          type: WebAppShellMessageType.StreamWrite,
          logLevel: LogLevel.Debug,
          streamId: 1,
          actions: [one, two],
        },
      ],
    });
  });

  test('a history for a stream that has closed changes nothing', () => {
    const coreContext = coreContextWith([]);
    expect(
      webAppStep(coreContext, {
        type: WebAppMessageType.HistoryResponse,
        logLevel: LogLevel.Debug,
        streamId: 1,
        history: [one],
      }),
    ).toEqual({ coreContext, outboundMessages: [] });
  });

  test('a broadcast action goes to the active streams only', () => {
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
          type: WebAppShellMessageType.StreamWrite,
          logLevel: LogLevel.Debug,
          streamId: 1,
          actions: [two],
        },
        {
          type: WebAppShellMessageType.StreamWrite,
          logLevel: LogLevel.Debug,
          streamId: 3,
          actions: [two],
        },
      ],
    });
  });

  test('a closed stream is removed and released', () => {
    expect(
      webAppStep(
        coreContextWith([
          [1, 'active'],
          [2, 'pending'],
        ]),
        {
          type: WebAppMessageType.StreamClosed,
          logLevel: LogLevel.Debug,
          streamId: 1,
        },
      ),
    ).toEqual({
      coreContext: coreContextWith([[2, 'pending']]),
      outboundMessages: [
        {
          type: WebAppShellMessageType.StreamClose,
          logLevel: LogLevel.Info,
          streamId: 1,
        },
      ],
    });
  });

  test('a second close of the same stream changes nothing', () => {
    const coreContext = coreContextWith([]);
    expect(
      webAppStep(coreContext, {
        type: WebAppMessageType.StreamClosed,
        logLevel: LogLevel.Debug,
        streamId: 1,
      }),
    ).toEqual({ coreContext, outboundMessages: [] });
  });
});
