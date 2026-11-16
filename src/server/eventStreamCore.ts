import type { Step } from '#server/actor.ts';
import {
  type CounterAction,
  type CounterMessage,
  CounterMessageType,
} from '#server/counterCore.ts';
import { LogLevel, type MessageBase } from '#server/message.ts';

export enum EventStreamMessageType {
  StreamRequested = 'eventStream/streamRequested',
  HistoryResponse = 'eventStream/historyResponse',
  BroadcastAction = 'eventStream/broadcastAction',
  StreamClosed = 'eventStream/streamClosed',
}

export enum EventStreamShellMessageType {
  StreamOpen = 'eventStreamShell/streamOpen',
  StreamWrite = 'eventStreamShell/streamWrite',
  StreamClose = 'eventStreamShell/streamClose',
}

export interface EventStreamCoreContext {
  readonly nextStreamId: number;
  readonly streams: ReadonlyMap<number, 'pending' | 'active'>;
}

export type EventStreamMessage = MessageBase &
  (
    | { readonly type: EventStreamMessageType.StreamRequested }
    | {
        readonly type: EventStreamMessageType.HistoryResponse;
        readonly streamId: number;
        readonly history: readonly CounterAction[];
      }
    | {
        readonly type: EventStreamMessageType.BroadcastAction;
        readonly action: CounterAction;
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
        readonly actions: readonly CounterAction[];
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
): Step<CounterMessage | EventStreamShellMessage, EventStreamCoreContext> {
  switch (inboundMessage.type) {
    case EventStreamMessageType.StreamRequested: {
      const streamId = coreContext.nextStreamId;
      return {
        coreContext: {
          nextStreamId: streamId + 1,
          streams: new Map(coreContext.streams).set(streamId, 'pending'),
        },
        outboundMessages: [
          {
            type: EventStreamShellMessageType.StreamOpen,
            logLevel: LogLevel.Info,
            streamId,
          },
          {
            type: CounterMessageType.HistoryRequested,
            logLevel: LogLevel.Debug,
            streamId,
          },
        ],
      };
    }

    case EventStreamMessageType.HistoryResponse: {
      const { streamId, history } = inboundMessage;
      // The stream can close before its history arrives.
      if (coreContext.streams.get(streamId) !== 'pending') {
        return { coreContext, outboundMessages: [] };
      }
      return {
        coreContext: {
          ...coreContext,
          streams: new Map(coreContext.streams).set(streamId, 'active'),
        },
        outboundMessages: [
          {
            type: EventStreamShellMessageType.StreamWrite,
            logLevel: LogLevel.Debug,
            streamId,
            actions: history,
          },
        ],
      };
    }

    case EventStreamMessageType.BroadcastAction: {
      // Mailboxes keep their order. An action that reaches a pending
      // stream is therefore already in the history that it waits for.
      const outboundMessages: EventStreamShellMessage[] = [];
      for (const [streamId, status] of coreContext.streams) {
        if (status === 'active') {
          outboundMessages.push({
            type: EventStreamShellMessageType.StreamWrite,
            logLevel: LogLevel.Debug,
            streamId,
            actions: [inboundMessage.action],
          });
        }
      }
      return { coreContext, outboundMessages };
    }

    case EventStreamMessageType.StreamClosed: {
      const { streamId } = inboundMessage;
      if (!coreContext.streams.has(streamId)) {
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
        ],
      };
    }
  }
}
