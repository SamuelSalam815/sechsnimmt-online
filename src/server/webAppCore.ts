import type { Step } from '#server/actor.ts';
import {
  type CounterAction,
  type CounterMessage,
  CounterMessageType,
} from '#server/counterCore.ts';
import { LogLevel, type MessageBase } from '#server/message.ts';

export enum WebAppMessageType {
  Ping = 'webApp/ping',
  HistoryResponse = 'webApp/historyResponse',
  BroadcastAction = 'webApp/broadcastAction',
  StreamRequested = 'webApp/streamRequested',
  StreamClosed = 'webApp/streamClosed',
}

export enum WebAppShellMessageType {
  Pong = 'shell/pong',
  StreamWrite = 'shell/streamWrite',
  StreamOpen = 'shell/streamOpen',
  StreamClose = 'shell/streamClose',
}

export interface WebAppCoreContext {
  readonly nextStreamId: number;
  readonly streams: ReadonlyMap<number, 'pending' | 'active'>;
}

export type WebAppMessage = MessageBase &
  (
    | { readonly type: WebAppMessageType.Ping }
    | { readonly type: WebAppMessageType.StreamRequested }
    | {
        readonly type: WebAppMessageType.HistoryResponse;
        readonly streamId: number;
        readonly history: readonly CounterAction[];
      }
    | {
        readonly type: WebAppMessageType.BroadcastAction;
        readonly action: CounterAction;
      }
    | {
        readonly type: WebAppMessageType.StreamClosed;
        readonly streamId: number;
      }
  );

export type WebAppShellMessage = MessageBase &
  (
    | { readonly type: WebAppShellMessageType.Pong }
    | {
        readonly type: WebAppShellMessageType.StreamOpen;
        readonly streamId: number;
      }
    | {
        readonly type: WebAppShellMessageType.StreamWrite;
        readonly streamId: number;
        readonly actions: readonly CounterAction[];
      }
    | {
        readonly type: WebAppShellMessageType.StreamClose;
        readonly streamId: number;
      }
  );

export const initialWebAppCoreContext: WebAppCoreContext = {
  nextStreamId: 0,
  streams: new Map(),
};

export function webAppStep(
  coreContext: WebAppCoreContext,
  inboundMessage: WebAppMessage,
): Step<CounterMessage | WebAppShellMessage, WebAppCoreContext> {
  switch (inboundMessage.type) {
    case WebAppMessageType.Ping:
      return {
        coreContext,
        outboundMessages: [
          { type: WebAppShellMessageType.Pong, logLevel: LogLevel.Debug },
        ],
      };

    case WebAppMessageType.StreamRequested: {
      const streamId = coreContext.nextStreamId;
      return {
        coreContext: {
          nextStreamId: streamId + 1,
          streams: new Map(coreContext.streams).set(streamId, 'pending'),
        },
        outboundMessages: [
          {
            type: WebAppShellMessageType.StreamOpen,
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

    case WebAppMessageType.HistoryResponse: {
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
            type: WebAppShellMessageType.StreamWrite,
            logLevel: LogLevel.Debug,
            streamId,
            actions: history,
          },
        ],
      };
    }

    case WebAppMessageType.BroadcastAction: {
      // Mailboxes keep their order. An action that reaches a pending
      // stream is therefore already in the history that it waits for.
      const outboundMessages: WebAppShellMessage[] = [];
      for (const [streamId, status] of coreContext.streams) {
        if (status === 'active') {
          outboundMessages.push({
            type: WebAppShellMessageType.StreamWrite,
            logLevel: LogLevel.Debug,
            streamId,
            actions: [inboundMessage.action],
          });
        }
      }
      return { coreContext, outboundMessages };
    }

    case WebAppMessageType.StreamClosed: {
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
            type: WebAppShellMessageType.StreamClose,
            logLevel: LogLevel.Info,
            streamId,
          },
        ],
      };
    }
  }
}
