import type { Step } from '#server/actor.ts';
import type { CounterAdvanced, CounterMessage } from '#server/counterCore.ts';
import { LogLevel, type MessageBase } from '#server/message.ts';

export interface WebAppCoreContext {
  readonly nextSubscriberId: number;
  readonly subscribers: ReadonlyMap<number, 'pending' | 'active'>;
}

export type WebAppMessage = MessageBase &
  (
    | { readonly type: 'webApp/ping' }
    | { readonly type: 'webApp/requestSubscription' }
    | {
        readonly type: 'webApp/historyDelivered';
        readonly subscriberId: number;
        readonly history: readonly CounterAdvanced[];
      }
    | { readonly type: 'webApp/fanOutAction'; readonly action: CounterAdvanced }
    | {
        readonly type: 'webApp/connectionClosed';
        readonly subscriberId: number;
      }
  );

export type WebAppShellMessage = MessageBase &
  (
    | { readonly type: 'shell/pong' }
    | { readonly type: 'shell/subscriptionOpen'; readonly subscriberId: number }
    | {
        readonly type: 'shell/write';
        readonly subscriberId: number;
        readonly actions: readonly CounterAdvanced[];
      }
    | {
        readonly type: 'shell/subscriptionClose';
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
    case 'webApp/ping':
      return {
        coreContext,
        outboundMessages: [{ type: 'shell/pong', logLevel: LogLevel.Debug }],
      };

    case 'webApp/requestSubscription': {
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
            type: 'shell/subscriptionOpen',
            logLevel: LogLevel.Info,
            subscriberId,
          },
          {
            type: 'counter/historyRequested',
            logLevel: LogLevel.Debug,
            subscriberId,
          },
        ],
      };
    }

    case 'webApp/historyDelivered': {
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
            type: 'shell/write',
            logLevel: LogLevel.Debug,
            subscriberId,
            actions: history,
          },
        ],
      };
    }

    case 'webApp/fanOutAction': {
      // Mailboxes keep their order. An action that reaches a pending
      // subscriber is therefore already in the history that it waits for.
      const outboundMessages: WebAppShellMessage[] = [];
      for (const [subscriberId, status] of coreContext.subscribers) {
        if (status === 'active') {
          outboundMessages.push({
            type: 'shell/write',
            logLevel: LogLevel.Debug,
            subscriberId,
            actions: [inboundMessage.action],
          });
        }
      }
      return { coreContext, outboundMessages };
    }

    case 'webApp/connectionClosed': {
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
            type: 'shell/subscriptionClose',
            logLevel: LogLevel.Info,
            subscriberId,
          },
        ],
      };
    }
  }
}
