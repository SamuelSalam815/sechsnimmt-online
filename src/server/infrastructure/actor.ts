import type { Logger } from 'pino';
import { LogLevel, type MessageBase } from '#server/infrastructure/message.ts';

export interface Step<OutboundMessage, CoreContext> {
  readonly coreContext: CoreContext;
  readonly outboundMessages: readonly OutboundMessage[];
}

export interface ActorDefinition<
  InboundMessage extends MessageBase,
  OutboundMessage extends MessageBase,
  CoreContext,
  ShellContext,
> {
  readonly initial: CoreContext;
  readonly step: (
    coreContext: CoreContext,
    inboundMessage: InboundMessage,
  ) => Step<OutboundMessage, CoreContext>;
  // The shell context is what the shell needs to act on an inbound message
  // and the core must not see, for example the response to an HTTP request.
  readonly interpret: (
    outboundMessage: OutboundMessage,
    shellContext: ShellContext | undefined,
  ) => void;
  readonly actorId: string;
  readonly logger: Logger;
}

export interface Actor<InboundMessage, ShellContext = never> {
  send(inboundMessage: InboundMessage, shellContext?: ShellContext): void;
}

export function createActor<
  InboundMessage extends MessageBase,
  OutboundMessage extends MessageBase,
  CoreContext,
  ShellContext = never,
>(
  definition: ActorDefinition<
    InboundMessage,
    OutboundMessage,
    CoreContext,
    ShellContext
  >,
): Actor<InboundMessage, ShellContext> {
  const logger = definition.logger.child({ actorId: definition.actorId });
  let coreContext = definition.initial;
  // A throw rejects the mailbox, so the actor runs no further message,
  // and Node ends the process on the unhandled rejection.
  let mailboxTail = Promise.resolve();

  function run(
    inboundMessage: InboundMessage,
    shellContext: ShellContext | undefined,
  ) {
    const step = definition.step(coreContext, inboundMessage);
    coreContext = step.coreContext;
    for (const outboundMessage of step.outboundMessages) {
      logAtItsLevel(logger, outboundMessage);
      definition.interpret(outboundMessage, shellContext);
    }
  }

  function send(
    inboundMessage: InboundMessage,
    shellContext: ShellContext | undefined,
  ) {
    logAtItsLevel(logger, inboundMessage, 'received');
    // A synchronous run would run the step of the receiver inside the
    // interpretation of the sender. A message that the receiver sends back
    // could then overtake one that the sender has yet to send.
    mailboxTail = mailboxTail.then(() => run(inboundMessage, shellContext));
  }

  return { send };
}

function logAtItsLevel(
  logger: Logger,
  message: MessageBase,
  logMessage?: string,
) {
  switch (message.logLevel) {
    case LogLevel.Debug:
      logger.debug(message, logMessage);
      return;
    case LogLevel.Info:
      logger.info(message, logMessage);
      return;
    case LogLevel.Error:
      logger.error(message, logMessage);
      return;
  }
}
