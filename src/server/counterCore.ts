import type { Step } from '#server/actor.ts';
import { LogLevel, type MessageBase } from '#server/message.ts';
import { type WebAppMessage, WebAppMessageType } from '#server/webAppCore.ts';

export enum CounterMessageType {
  TickRequested = 'counter/tickRequested',
  HistoryRequested = 'counter/historyRequested',
}

export interface CounterAction {
  readonly type: 'counter/tick';
  readonly totalCount: number;
}

export interface CounterCoreContext {
  readonly history: readonly CounterAction[];
}

export type CounterMessage = MessageBase &
  (
    | { readonly type: CounterMessageType.TickRequested }
    | {
        readonly type: CounterMessageType.HistoryRequested;
        readonly subscriberId: number;
      }
  );

export const initialCounterCoreContext: CounterCoreContext = { history: [] };

export function counterValue(history: readonly CounterAction[]): number {
  return history.at(-1)?.totalCount ?? 0;
}

export function counterStep(
  coreContext: CounterCoreContext,
  inboundMessage: CounterMessage,
): Step<WebAppMessage, CounterCoreContext> {
  switch (inboundMessage.type) {
    case CounterMessageType.TickRequested: {
      const action: CounterAction = {
        type: 'counter/tick',
        totalCount: counterValue(coreContext.history) + 1,
      };
      return {
        coreContext: { history: [...coreContext.history, action] },
        outboundMessages: [
          {
            type: WebAppMessageType.BroadcastAction,
            logLevel: LogLevel.Info,
            action,
          },
        ],
      };
    }
    case CounterMessageType.HistoryRequested:
      return {
        coreContext,
        outboundMessages: [
          {
            type: WebAppMessageType.HistoryResponse,
            logLevel: LogLevel.Debug,
            subscriberId: inboundMessage.subscriberId,
            history: coreContext.history,
          },
        ],
      };
  }
}
