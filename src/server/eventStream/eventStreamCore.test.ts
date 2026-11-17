import { describe, expect, test } from 'vitest';
import { unpickCard } from '#engine/reducers/gameSlice.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import {
  type EventStreamCoreContext,
  EventStreamMessageType,
  EventStreamShellMessageType,
  eventStreamStep,
  type OpenStream,
  type StreamEvent,
  StreamStatus,
} from '#server/eventStream/eventStreamCore.ts';
import { GameRunnerMessageType } from '#server/gameRunner/gameRunnerCore.ts';
import { LogLevel } from '#server/infrastructure/message.ts';
import { RoomMessageType, type RoomView } from '#server/room/roomCore.ts';

function appliedAction(sequence: number): AppliedAction {
  return {
    oldVersion: { sequence: sequence - 1, major: false },
    newVersion: { sequence, major: false },
    action: unpickCard({ playerId: 'a' }),
  };
}

const one = appliedAction(1);
const two = appliedAction(2);

const roomView: RoomView = {
  gameStarted: false,
  players: [
    { playerId: 'player1', name: 'Ada', ready: false, connected: true },
  ],
};

function pending(clientToken?: string): OpenStream {
  return { status: StreamStatus.Pending, clientToken };
}

function active(clientToken?: string): OpenStream {
  return { status: StreamStatus.Active, clientToken };
}

function coreContextWith(
  streams: [number, OpenStream][],
): EventStreamCoreContext {
  return { nextStreamId: 5, streams: new Map(streams) };
}

function streamWrite(streamId: number, streamEvent: StreamEvent) {
  return {
    type: EventStreamShellMessageType.StreamWrite,
    logLevel: LogLevel.Debug,
    streamId,
    streamEvent,
  };
}

describe('eventStreamStep', () => {
  test('a stream request accepts a pending stream under the next ID, asks the game runner for its history and tells the room', () => {
    expect(
      eventStreamStep(coreContextWith([]), {
        type: EventStreamMessageType.StreamRequested,
        logLevel: LogLevel.Debug,
        clientToken: 'secret-a',
      }),
    ).toEqual({
      coreContext: {
        nextStreamId: 6,
        streams: new Map([[5, pending('secret-a')]]),
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
        {
          type: RoomMessageType.StreamOpened,
          logLevel: LogLevel.Debug,
          streamId: 5,
          clientToken: 'secret-a',
        },
      ],
    });
  });

  test('a history response activates the stream and writes the history to it', () => {
    expect(
      eventStreamStep(coreContextWith([[1, pending('secret-a')]]), {
        type: EventStreamMessageType.HistoryResponse,
        logLevel: LogLevel.Debug,
        streamId: 1,
        history: [one, two],
      }),
    ).toEqual({
      coreContext: coreContextWith([[1, active('secret-a')]]),
      outboundMessages: [
        streamWrite(1, { eventName: 'gameActions', actions: [one, two] }),
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
      [1, active()],
      [2, pending()],
      [3, active()],
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
        streamWrite(1, { eventName: 'gameActions', actions: [one, two] }),
        streamWrite(3, { eventName: 'gameActions', actions: [one, two] }),
      ],
    });
  });

  test('a broadcast room view goes to every open stream', () => {
    const coreContext = coreContextWith([
      [1, active()],
      [2, pending()],
    ]);
    expect(
      eventStreamStep(coreContext, {
        type: EventStreamMessageType.BroadcastRoomView,
        logLevel: LogLevel.Debug,
        roomView,
      }),
    ).toEqual({
      coreContext,
      outboundMessages: [
        streamWrite(1, { eventName: 'roomView', roomView }),
        streamWrite(2, { eventName: 'roomView', roomView }),
      ],
    });
  });

  test('a closed stream is removed and released, and the room learns of it', () => {
    expect(
      eventStreamStep(
        coreContextWith([
          [1, active('secret-a')],
          [2, pending()],
        ]),
        {
          type: EventStreamMessageType.StreamClosed,
          logLevel: LogLevel.Debug,
          streamId: 1,
        },
      ),
    ).toEqual({
      coreContext: coreContextWith([[2, pending()]]),
      outboundMessages: [
        {
          type: EventStreamShellMessageType.StreamClose,
          logLevel: LogLevel.Info,
          streamId: 1,
        },
        {
          type: RoomMessageType.StreamClosed,
          logLevel: LogLevel.Debug,
          streamId: 1,
          clientToken: 'secret-a',
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
