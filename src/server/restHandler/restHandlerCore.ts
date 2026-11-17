import type { Step } from '#server/infrastructure/actor.ts';
import { LogLevel, type MessageBase } from '#server/infrastructure/message.ts';

export enum RestHandlerMessageType {
  Ping = 'restHandler/ping',
}

export enum RestHandlerShellMessageType {
  Pong = 'restHandlerShell/pong',
}

export type RestHandlerMessage = MessageBase & {
  readonly type: RestHandlerMessageType.Ping;
};

export type RestHandlerShellMessage = MessageBase & {
  readonly type: RestHandlerShellMessageType.Pong;
};

export const initialRestHandlerCoreContext = null;

export function restHandlerStep(
  coreContext: null,
  inboundMessage: RestHandlerMessage,
): Step<RestHandlerShellMessage, null> {
  switch (inboundMessage.type) {
    case RestHandlerMessageType.Ping:
      return {
        coreContext,
        outboundMessages: [
          { type: RestHandlerShellMessageType.Pong, logLevel: LogLevel.Debug },
        ],
      };
  }
}
