import type { Logger } from 'pino';
import { type Actor, createActor } from '#server/actor.ts';
import {
  type CounterMessage,
  CounterMessageType,
  counterStep,
  initialCounterCoreContext,
} from '#server/counterCore.ts';
import type { EventStreamMessage } from '#server/eventStreamCore.ts';
import { LogLevel } from '#server/message.ts';

export function counterActor(
  sendToEventStream: (message: EventStreamMessage) => void,
  logger: Logger,
): Actor<CounterMessage> {
  const counter = createActor({
    initial: initialCounterCoreContext,
    step: counterStep,
    interpret: sendToEventStream,
    logger,
  });

  setInterval(
    () =>
      counter.send({
        type: CounterMessageType.TickRequested,
        logLevel: LogLevel.Debug,
      }),
    10_000,
  );
  return counter;
}
