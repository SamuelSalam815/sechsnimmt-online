import type { Logger } from 'pino';
import { type Actor, createActor } from '#server/actor.ts';
import {
  type CounterMessage,
  counterStep,
  initialCounterCoreContext,
} from '#server/counterCore.ts';
import { LogLevel } from '#server/message.ts';
import type { WebAppMessage } from '#server/webAppCore.ts';

export function counterActor(
  sendToWebApp: (message: WebAppMessage) => void,
  logger: Logger,
): Actor<CounterMessage> {
  const counter = createActor({
    initial: initialCounterCoreContext,
    step: counterStep,
    interpret: sendToWebApp,
    logger,
  });

  setInterval(
    () => counter.send({ type: 'counter/tick', logLevel: LogLevel.Debug }),
    10_000,
  );
  return counter;
}
