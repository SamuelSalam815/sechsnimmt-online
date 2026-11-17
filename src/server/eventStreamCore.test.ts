import { describe, expect, test } from 'vitest';
import { unpickCard } from '#engine/reducers/gameSlice.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import {
  type EventStreamCoreContext,
  EventStreamMessageType,
  EventStreamShellMessageType,
  eventStreamStep,
} from '#server/eventStreamCore.ts';
import { GameRunnerMessageType } from '#server/gameRunnerCore.ts';
import { LogLevel } from '#server/message.ts';

function appliedAction(sequence: number): AppliedAction {
  return {
    oldVersion: { sequence: sequence - 1, major: false },
    newVersion: { sequence, major: false },
    action: unpickCard({ playerId: 'a' }),
  };
}

const one = appliedAction(1);
const two = appliedAction(2);

function coreContextWith(
  streams: [number, 'pending' | 'active'][],
): EventStreamCoreContext {
  return { nextStreamId: 5, streams: new Map(streams) };
}

describe('eventStreamStep', () => {
  test('a stream request accepts a pending stream under the next ID and asks the game runner for its history', () => {
    expect(
      eventStreamStep(coreContextWith([]), {
        type: EventStreamMessageType.StreamRequested,
        logLevel: LogLevel.Debug,
      }),
    ).toEqual({
      coreContext: {
        nextStreamId: 6,
        streams: new Map([[5, 'pending']]),
      },
      outboundMessages: [
        {
          type: EventStreamShellMessageType.StreamOpen,
          logLevel: LogLevel.Info,
          streamId: 5,
        },
        {
          type: GameRunnerMessageType.HistoryRequested,
          logLevel: LogLevel.Debug,
          streamId: 5,
        },
      ],
    });
  });

  test('a history response activates the stream and writes the history to it', () => {
    expect(
      eventStreamStep(coreContextWith([[1, 'pending']]), {
        type: EventStreamMessageType.HistoryResponse,
        logLevel: LogLevel.Debug,
        streamId: 1,
        history: [one, two],
      }),
    ).toEqual({
      coreContext: coreContextWith([[1, 'active']]),
      outboundMessages: [
        {
          type: EventStreamShellMessageType.StreamWrite,
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
      eventStreamStep(coreContext, {
        type: EventStreamMessageType.HistoryResponse,
        logLevel: LogLevel.Debug,
        streamId: 1,
        history: [one],
      }),
    ).toEqual({ coreContext, outboundMessages: [] });
  });

  test('broadcast actions go to the active streams only', () => {
    const coreContext = coreContextWith([
      [1, 'active'],
      [2, 'pending'],
      [3, 'active'],
    ]);
    expect(
      eventStreamStep(coreContext, {
        type: EventStreamMessageType.BroadcastActions,
        logLevel: LogLevel.Info,
        actions: [one, two],
      }),
    ).toEqual({
      coreContext,
      outboundMessages: [
        {
          type: EventStreamShellMessageType.StreamWrite,
          logLevel: LogLevel.Debug,
          streamId: 1,
          actions: [one, two],
        },
        {
          type: EventStreamShellMessageType.StreamWrite,
          logLevel: LogLevel.Debug,
          streamId: 3,
          actions: [one, two],
        },
      ],
    });
  });

  test('a closed stream is removed and released', () => {
    expect(
      eventStreamStep(
        coreContextWith([
          [1, 'active'],
          [2, 'pending'],
        ]),
        {
          type: EventStreamMessageType.StreamClosed,
          logLevel: LogLevel.Debug,
          streamId: 1,
        },
      ),
    ).toEqual({
      coreContext: coreContextWith([[2, 'pending']]),
      outboundMessages: [
        {
          type: EventStreamShellMessageType.StreamClose,
          logLevel: LogLevel.Info,
          streamId: 1,
        },
      ],
    });
  });

  test('a second close of the same stream changes nothing', () => {
    const coreContext = coreContextWith([]);
    expect(
      eventStreamStep(coreContext, {
        type: EventStreamMessageType.StreamClosed,
        logLevel: LogLevel.Debug,
        streamId: 1,
      }),
    ).toEqual({ coreContext, outboundMessages: [] });
  });
});
