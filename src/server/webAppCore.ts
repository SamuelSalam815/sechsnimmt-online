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
  ConnectionRequested = 'webApp/connectionRequested',
  ConnectionClosed = 'webApp/connectionClosed',
}

export enum WebAppShellMessageType {
  Pong = 'shell/pong',
  Write = 'shell/write',
  SubscriptionOpen = 'shell/subscriptionOpen',
  SubscriptionClose = 'shell/subscriptionClose',
}

export interface WebAppCoreContext {
  readonly nextSubscriberId: number;
  readonly subscribers: ReadonlyMap<number, 'pending' | 'active'>;
}

export type WebAppMessage = MessageBase &
  (
    | { readonly type: WebAppMessageType.Ping }
    | { readonly type: WebAppMessageType.ConnectionRequested }
    | {
        readonly type: WebAppMessageType.HistoryResponse;
        readonly subscriberId: number;
        readonly history: readonly CounterAction[];
      }
    | {
        readonly type: WebAppMessageType.BroadcastAction;
        readonly action: CounterAction;
      }
    | {
        readonly type: WebAppMessageType.ConnectionClosed;
        readonly subscriberId: number;
      }
  );

export type WebAppShellMessage = MessageBase &
  (
    | { readonly type: WebAppShellMessageType.Pong }
    | {
        readonly type: WebAppShellMessageType.SubscriptionOpen;
        readonly subscriberId: number;
      }
    | {
        readonly type: WebAppShellMessageType.Write;
        readonly subscriberId: number;
        readonly actions: readonly CounterAction[];
      }
    | {
        readonly type: WebAppShellMessageType.SubscriptionClose;
        readonly subscriberId: number;
      }
  );

export const initialWebAppCoreContext: WebAppCoreContext = {
  nextSubscriberId: 0,
  subscribers: new Map(),
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

    case WebAppMessageType.ConnectionRequested: {
      const subscriberId = coreContext.nextSubscriberId;
      return {
        coreContext: {
          nextSubscriberId: subscriberId + 1,
          subscribers: new Map(coreContext.subscribers).set(
            subscriberId,
            'pending',
          ),
        },
        outboundMessages: [
          {
            type: WebAppShellMessageType.SubscriptionOpen,
            logLevel: LogLevel.Info,
            subscriberId,
          },
          {
            type: CounterMessageType.HistoryRequested,
            logLevel: LogLevel.Debug,
            subscriberId,
          },
        ],
      };
    }

    case WebAppMessageType.HistoryResponse: {
      const { subscriberId, history } = inboundMessage;
      // The subscriber can close before its history arrives.
      if (coreContext.subscribers.get(subscriberId) !== 'pending') {
        return { coreContext, outboundMessages: [] };
      }
      return {
        coreContext: {
          ...coreContext,
          subscribers: new Map(coreContext.subscribers).set(
            subscriberId,
            'active',
          ),
        },
        outboundMessages: [
          {
            type: WebAppShellMessageType.Write,
            logLevel: LogLevel.Debug,
            subscriberId,
            actions: history,
          },
        ],
      };
    }

    case WebAppMessageType.BroadcastAction: {
      // Mailboxes keep their order. An action that reaches a pending
      // subscriber is therefore already in the history that it waits for.
      const outboundMessages: WebAppShellMessage[] = [];
      for (const [subscriberId, status] of coreContext.subscribers) {
        if (status === 'active') {
          outboundMessages.push({
            type: WebAppShellMessageType.Write,
            logLevel: LogLevel.Debug,
            subscriberId,
            actions: [inboundMessage.action],
          });
        }
      }
      return { coreContext, outboundMessages };
    }

    case WebAppMessageType.ConnectionClosed: {
      const { subscriberId } = inboundMessage;
      if (!coreContext.subscribers.has(subscriberId)) {
        return { coreContext, outboundMessages: [] };
      }
      const subscribers = new Map(coreContext.subscribers);
      subscribers.delete(subscriberId);
      return {
        coreContext: { ...coreContext, subscribers },
        outboundMessages: [
          {
            type: WebAppShellMessageType.SubscriptionClose,
            logLevel: LogLevel.Info,
            subscriberId,
          },
        ],
      };
    }
  }
}
