import { type Response, Router } from 'express';
import type { Logger } from 'pino';
import { type Actor, createActor } from '#server/actor.ts';
import {
  type CounterAction,
  type CounterMessage,
  CounterMessageType,
} from '#server/counterCore.ts';
import {
  type EventStreamMessage,
  EventStreamMessageType,
  EventStreamShellMessageType,
  eventStreamStep,
  initialEventStreamCoreContext,
} from '#server/eventStreamCore.ts';
import { LogLevel } from '#server/message.ts';
import { requireValue } from '#server/requireValue.ts';

export interface EventStream {
  readonly actor: Actor<EventStreamMessage, Response>;
  readonly router: Router;
}

export function eventStreamActor(
  sendToCounter: (message: CounterMessage) => void,
  logger: Logger,
): EventStream {
  const streams = new Map<number, Response>();

  const actor = createActor({
    initial: initialEventStreamCoreContext,
    step: eventStreamStep,
    interpret(outboundMessage, response: Response | undefined) {
      switch (outboundMessage.type) {
        case CounterMessageType.TickRequested:
        case CounterMessageType.HistoryRequested:
          sendToCounter(outboundMessage);
          return;

        case EventStreamShellMessageType.StreamOpen:
          openStream(
            outboundMessage.streamId,
            requireValue(response, 'the inbound message carries no response'),
          );
          return;

        case EventStreamShellMessageType.StreamWrite:
          writeActions(outboundMessage.streamId, outboundMessage.actions);
          return;

        case EventStreamShellMessageType.StreamClose:
          streams.delete(outboundMessage.streamId);
          return;
      }
    },
    actorId: 'eventStream',
    logger,
  });

  function openStream(streamId: number, stream: Response): void {
    stream.on('close', () =>
      actor.sendFromOutside({
        type: EventStreamMessageType.StreamClosed,
        logLevel: LogLevel.Debug,
        streamId,
      }),
    );
    streams.set(streamId, stream);
    stream.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
  }

  function writeActions(
    streamId: number,
    actions: readonly CounterAction[],
  ): void {
    const stream = streams.get(streamId);
    if (stream === undefined) {
      logger.error({ streamId }, 'a write found no open stream for its ID');
      return;
    }
    stream.write(`data: ${JSON.stringify(actions)}\n\n`);
  }

  const router = Router();
  router.get('/counter/events', (_request, response) => {
    actor.sendFromOutside(
      {
        type: EventStreamMessageType.StreamRequested,
        logLevel: LogLevel.Debug,
      },
      response,
    );
  });
  return { actor, router };
}
