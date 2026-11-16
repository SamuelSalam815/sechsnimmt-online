import type { Request, Response } from 'express';
import type { Logger } from '#server/logger.ts';

export class EventStream {
  readonly #subscribers = new Set<Response>();
  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  get subscriberCount() {
    return this.#subscribers.size;
  }

  open(request: Request, response: Response, firstData: string) {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    response.write(`data: ${firstData}\n\n`);
    this.#subscribers.add(response);
    this.#logger.info(
      { subscribers: this.subscriberCount },
      'subscriber joined',
    );

    request.on('close', () => {
      this.#subscribers.delete(response);
      this.#logger.info(
        { subscribers: this.subscriberCount },
        'subscriber left',
      );
    });
  }

  broadcast(data: string) {
    for (const subscriber of this.#subscribers) {
      subscriber.write(`data: ${data}\n\n`);
    }
  }
}
