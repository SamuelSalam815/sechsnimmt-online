import { type Actor, createActor } from '#server/actor.ts';
import {
  type CounterMessage,
  counterStep,
  initialCounterCoreContext,
} from '#server/counterCore.ts';
import type { LoggerMessage } from '#server/loggerCore.ts';
import type { WebAppMessage } from '#server/webAppCore.ts';

export function counterActor(
  sendToWebApp: (message: WebAppMessage) => void,
  logger: Actor<LoggerMessage>,
): Actor<CounterMessage> {
  const counter = createActor({
    initial: initialCounterCoreContext,
    step: counterStep,
    interpret: sendToWebApp,
    observe: (inboundMessage, outboundMessages) =>
      logger.send({ type: 'logger/stepped', inboundMessage, outboundMessages }),
  });

  setInterval(() => counter.send({ type: 'counter/tick' }), 10_000);
  return counter;
}
