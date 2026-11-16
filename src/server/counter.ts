import { Router } from 'express';
import { EventStream } from '#server/eventStream.ts';
import type { Logger } from '#server/logger.ts';

export function counterRouter(logger: Logger): Router {
  let counter = 0;
  const events = new EventStream(logger);

  setInterval(() => {
    counter += 1;
    events.broadcast(String(counter));
    logger.info(
      { counter, subscribers: events.subscriberCount },
      'counter advanced',
    );
  }, 10_000);

  const router = Router();
  router.get('/events', (request, response) => {
    events.open(request, response, String(counter));
  });
  return router;
}
