import type { Step } from '#server/actor.ts';
import type { CounterAdvanced, CounterMessage } from '#server/counterCore.ts';

export interface WebAppCoreContext {
  readonly nextSubscriberId: number;
  readonly subscribers: ReadonlyMap<number, 'pending' | 'active'>;
}

export type WebAppMessage =
  | { readonly type: 'webApp/ping' }
  | { readonly type: 'webApp/requestSubscription' }
  | {
      readonly type: 'webApp/historyDelivered';
      readonly subscriberId: number;
      readonly history: readonly CounterAdvanced[];
    }
  | { readonly type: 'webApp/fanOutAction'; readonly action: CounterAdvanced }
  | {
      readonly type: 'webApp/subscriptionClosed';
      readonly subscriberId: number;
    };

export type WebAppShellMessage =
  | { readonly type: 'webAppShell/pong' }
  | { readonly type: 'webAppShell/accept'; readonly subscriberId: number }
  | {
      readonly type: 'webAppShell/write';
      readonly subscriberId: number;
      readonly actions: readonly CounterAdvanced[];
    }
  | { readonly type: 'webAppShell/release'; readonly subscriberId: number };

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
      return { coreContext, outboundMessages: [{ type: 'webAppShell/pong' }] };

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
          { type: 'webAppShell/accept', subscriberId },
          { type: 'counter/historyRequested', subscriberId },
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
          { type: 'webAppShell/write', subscriberId, actions: history },
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
            type: 'webAppShell/write',
            subscriberId,
            actions: [inboundMessage.action],
          });
        }
      }
      return { coreContext, outboundMessages };
    }

    case 'webApp/subscriptionClosed': {
      const { subscriberId } = inboundMessage;
      if (!coreContext.subscribers.has(subscriberId)) {
        return { coreContext, outboundMessages: [] };
      }
      const subscribers = new Map(coreContext.subscribers);
      subscribers.delete(subscriberId);
      return {
        coreContext: { ...coreContext, subscribers },
        outboundMessages: [{ type: 'webAppShell/release', subscriberId }],
      };
    }
  }
}
