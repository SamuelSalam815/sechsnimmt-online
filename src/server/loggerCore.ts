import type { Step } from '#server/actor.ts';
import type { CounterMessage } from '#server/counterCore.ts';
import type { WebAppMessage, WebAppShellMessage } from '#server/webAppCore.ts';

export type LoggerMessage =
  | {
      readonly type: 'logger/stepped';
      readonly inboundMessage: CounterMessage | WebAppMessage;
      readonly outboundMessages: readonly (
        | CounterMessage
        | WebAppMessage
        | WebAppShellMessage
      )[];
    }
  | {
      readonly type: 'logger/httpRequest';
      readonly method: string;
      readonly url: string;
    }
  | { readonly type: 'logger/listening'; readonly port: number };

export interface LoggerShellMessage {
  readonly type: 'loggerShell/log';
  readonly fields: object;
  readonly text: string;
}

export interface LoggerCoreContext {
  readonly subscribers: number;
}

export const initialLoggerCoreContext: LoggerCoreContext = { subscribers: 0 };

export function loggerStep(
  coreContext: LoggerCoreContext,
  inboundMessage: LoggerMessage,
): Step<LoggerShellMessage, LoggerCoreContext> {
  switch (inboundMessage.type) {
    case 'logger/stepped':
      return logsOfStep(coreContext, inboundMessage.outboundMessages);

    case 'logger/httpRequest':
      return {
        coreContext,
        outboundMessages: [
          log(
            { method: inboundMessage.method, url: inboundMessage.url },
            'request',
          ),
        ],
      };

    case 'logger/listening':
      return {
        coreContext,
        outboundMessages: [
          log({}, `open a client at http://localhost:${inboundMessage.port}`),
        ],
      };
  }
}

function logsOfStep(
  coreContext: LoggerCoreContext,
  stepOutboundMessages: readonly (
    | CounterMessage
    | WebAppMessage
    | WebAppShellMessage
  )[],
): Step<LoggerShellMessage, LoggerCoreContext> {
  let { subscribers } = coreContext;
  const outboundMessages: LoggerShellMessage[] = [];
  for (const message of stepOutboundMessages) {
    switch (message.type) {
      case 'webAppShell/accept':
        subscribers += 1;
        outboundMessages.push(
          log(
            { subscriberId: message.subscriberId, subscribers },
            'subscriber joined',
          ),
        );
        break;
      case 'webAppShell/release':
        subscribers -= 1;
        outboundMessages.push(
          log(
            { subscriberId: message.subscriberId, subscribers },
            'subscriber left',
          ),
        );
        break;
      case 'webApp/fanOutAction':
        outboundMessages.push(
          log(
            { counter: message.action.value, subscribers },
            'counter advanced',
          ),
        );
        break;
    }
  }
  return { coreContext: { subscribers }, outboundMessages };
}

function log(fields: object, text: string): LoggerShellMessage {
  return { type: 'loggerShell/log', fields, text };
}
