import type { AppliedAction } from '#engine/reducers/history.ts';
import {
  type GameRunnerMessage,
  GameRunnerMessageType,
} from '#server/gameRunner/gameRunnerCore.ts';
import type { Step } from '#server/infrastructure/actor.ts';
import { LogLevel, type MessageBase } from '#server/infrastructure/message.ts';
import {
  type RoomMessage,
  RoomMessageType,
  type RoomView,
} from '#server/room/roomCore.ts';

export enum EventStreamMessageType {
  StreamRequested = 'eventStream/streamRequested',
  HistoryResponse = 'eventStream/historyResponse',
  BroadcastActions = 'eventStream/broadcastActions',
  BroadcastRoomView = 'eventStream/broadcastRoomView',
  StreamClosed = 'eventStream/streamClosed',
}

export enum EventStreamShellMessageType {
  StreamOpen = 'eventStreamShell/streamOpen',
  StreamWrite = 'eventStreamShell/streamWrite',
  StreamClose = 'eventStreamShell/streamClose',
}

export enum StreamStatus {
  Pending = 'pending',
  Active = 'active',
}

export interface OpenStream {
  readonly status: StreamStatus;
  // Undefined for a client that watches without a seat.
  readonly clientToken: string | undefined;
}

export interface EventStreamCoreContext {
  readonly nextStreamId: number;
  readonly streams: ReadonlyMap<number, OpenStream>;
}

export type StreamEvent =
  | {
      readonly eventName: 'gameActions';
      readonly actions: readonly AppliedAction[];
    }
  | { readonly eventName: 'roomView'; readonly roomView: RoomView };

export type EventStreamMessage = MessageBase &
  (
    | {
        readonly type: EventStreamMessageType.StreamRequested;
        readonly clientToken: string | undefined;
      }
    | {
        readonly type: EventStreamMessageType.HistoryResponse;
        readonly streamId: number;
        readonly history: readonly AppliedAction[];
      }
    | {
        readonly type: EventStreamMessageType.BroadcastActions;
        readonly actions: readonly AppliedAction[];
      }
    | {
        readonly type: EventStreamMessageType.BroadcastRoomView;
        readonly roomView: RoomView;
      }
    | {
        readonly type: EventStreamMessageType.StreamClosed;
        readonly streamId: number;
      }
  );

export type EventStreamShellMessage = MessageBase &
  (
    | {
        readonly type: EventStreamShellMessageType.StreamOpen;
        readonly streamId: number;
      }
    | {
        readonly type: EventStreamShellMessageType.StreamWrite;
        readonly streamId: number;
        readonly streamEvent: StreamEvent;
      }
    | {
        readonly type: EventStreamShellMessageType.StreamClose;
        readonly streamId: number;
      }
  );

export const initialEventStreamCoreContext: EventStreamCoreContext = {
  nextStreamId: 0,
  streams: new Map(),
};

export function eventStreamStep(
  coreContext: EventStreamCoreContext,
  inboundMessage: EventStreamMessage,
): Step<
  GameRunnerMessage | RoomMessage | EventStreamShellMessage,
  EventStreamCoreContext
> {
  switch (inboundMessage.type) {
    case EventStreamMessageType.StreamRequested: {
      const streamId = coreContext.nextStreamId;
      const { clientToken } = inboundMessage;
      return {
        coreContext: {
          nextStreamId: streamId + 1,
          streams: new Map(coreContext.streams).set(streamId, {
            status: StreamStatus.Pending,
            clientToken,
          }),
        },
        outboundMessages: [
          {
            type: EventStreamShellMessageType.StreamOpen,
            logLevel: LogLevel.Info,
            streamId,
          },
          {
            type: GameRunnerMessageType.HistoryRequested,
            logLevel: LogLevel.Debug,
            streamId,
          },
          {
            type: RoomMessageType.StreamOpened,
            logLevel: LogLevel.Debug,
            streamId,
            clientToken,
          },
        ],
      };
    }

    case EventStreamMessageType.HistoryResponse: {
      const { streamId, history } = inboundMessage;
      const stream = coreContext.streams.get(streamId);
      // The stream can close before its history arrives.
      if (stream?.status !== StreamStatus.Pending) {
        return { coreContext, outboundMessages: [] };
      }
      return {
        coreContext: {
          ...coreContext,
          streams: new Map(coreContext.streams).set(streamId, {
            ...stream,
            status: StreamStatus.Active,
          }),
        },
        outboundMessages: [
          streamWrite(streamId, { eventName: 'gameActions', actions: history }),
        ],
      };
    }

    case EventStreamMessageType.BroadcastActions: {
      // Mailboxes keep their order. An action that reaches a pending
      // stream is therefore already in the history that it waits for.
      const outboundMessages: EventStreamShellMessage[] = [];
      for (const [streamId, stream] of coreContext.streams) {
        if (stream.status === StreamStatus.Active) {
          outboundMessages.push(
            streamWrite(streamId, {
              eventName: 'gameActions',
              actions: inboundMessage.actions,
            }),
          );
        }
      }
      return { coreContext, outboundMessages };
    }

    case EventStreamMessageType.BroadcastRoomView: {
      // A room view replaces the one before it, so a pending stream takes it
      // as well.
      const outboundMessages: EventStreamShellMessage[] = [];
      for (const streamId of coreContext.streams.keys()) {
        outboundMessages.push(
          streamWrite(streamId, {
            eventName: 'roomView',
            roomView: inboundMessage.roomView,
          }),
        );
      }
      return { coreContext, outboundMessages };
    }

    case EventStreamMessageType.StreamClosed: {
      const { streamId } = inboundMessage;
      const stream = coreContext.streams.get(streamId);
      if (stream === undefined) {
        return { coreContext, outboundMessages: [] };
      }
      const streams = new Map(coreContext.streams);
      streams.delete(streamId);
      return {
        coreContext: { ...coreContext, streams },
        outboundMessages: [
          {
            type: EventStreamShellMessageType.StreamClose,
            logLevel: LogLevel.Info,
            streamId,
          },
          {
            type: RoomMessageType.StreamClosed,
            logLevel: LogLevel.Debug,
            streamId,
            clientToken: stream.clientToken,
          },
        ],
      };
    }
  }
}

function streamWrite(
  streamId: number,
  streamEvent: StreamEvent,
): EventStreamShellMessage {
  return {
    type: EventStreamShellMessageType.StreamWrite,
    logLevel: LogLevel.Debug,
    streamId,
    streamEvent,
  };
}
