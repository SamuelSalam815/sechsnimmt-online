import type { Step } from '#server/actor.ts';
import type { WebAppMessage } from '#server/webAppCore.ts';

export interface CounterAdvanced {
  readonly type: 'counter/advanced';
  readonly value: number;
}

export interface CounterCoreContext {
  readonly history: readonly CounterAdvanced[];
}

export type CounterMessage =
  | { readonly type: 'counter/tick' }
  | {
      readonly type: 'counter/historyRequested';
      readonly subscriberId: number;
    };

export const initialCounterCoreContext: CounterCoreContext = { history: [] };

export function counterValue(history: readonly CounterAdvanced[]): number {
  return history.at(-1)?.value ?? 0;
}

export function counterStep(
  coreContext: CounterCoreContext,
  inboundMessage: CounterMessage,
): Step<WebAppMessage, CounterCoreContext> {
  switch (inboundMessage.type) {
    case 'counter/tick': {
      const action: CounterAdvanced = {
        type: 'counter/advanced',
        value: counterValue(coreContext.history) + 1,
      };
      return {
        coreContext: { history: [...coreContext.history, action] },
        outboundMessages: [{ type: 'webApp/fanOutAction', action }],
      };
    }
    case 'counter/historyRequested':
      return {
        coreContext,
        outboundMessages: [
          {
            type: 'webApp/historyDelivered',
            subscriberId: inboundMessage.subscriberId,
            history: coreContext.history,
          },
        ],
      };
  }
}
