import { createServer } from 'node:http';
import express, { type Request, type Response } from 'express';
import pino from 'pino';

const port = 3000;

const inProduction = process.env.NODE_ENV === 'production';

const logger = pino(
  inProduction ? {} : { transport: { target: 'pino-pretty' } },
);

const app = express();
const httpServer = createServer(app);

app.use((request, _response, next) => {
  logger.info({ method: request.method, url: request.url }, 'request');
  next();
});

app.get('/api/ping', (_request: Request, response: Response) => {
  response.json({ message: 'pong' });
});

let counter = 0;
const subscribers = new Set<Response>();

app.get('/api/counter/events', (request: Request, response: Response) => {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  response.write(`data: ${counter}\n\n`);
  subscribers.add(response);
  logger.info({ subscribers: subscribers.size }, 'subscriber joined');

  request.on('close', () => {
    subscribers.delete(response);
    logger.info({ subscribers: subscribers.size }, 'subscriber left');
  });
});

setInterval(() => {
  counter += 1;
  for (const subscriber of subscribers) {
    subscriber.write(`data: ${counter}\n\n`);
  }
  logger.info({ counter, subscribers: subscribers.size }, 'counter advanced');
}, 10_000);

if (inProduction) {
  // `npm run build` writes the client here.
  app.use(express.static('dist'));
} else {
  // Vite is a devDependency, so production must not reach this import.
  const vite = await import('vite');
  const devServer = await vite.createServer({
    appType: 'spa',
    // Vite serves the client through this server instead of one of its own,
    // which keeps the page and the API on a single port. Handing it the HTTP
    // server puts the HMR socket on that port as well.
    server: { middlewareMode: true, hmr: { server: httpServer } },
  });
  app.use(devServer.middlewares);
}

httpServer.listen(port, () => {
  logger.info(`open a client at http://localhost:${port}`);
});
