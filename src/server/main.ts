import express, { type Request, type Response } from 'express';
import pino from 'pino';

const serverPort = 3000;

// Vite serves the client itself while developing, with HMR. Its port comes
// from `server.port` of vite.config.js.
const clientDevUrl = 'http://localhost:5173';

const inProduction = process.env.NODE_ENV === 'production';

const logger = pino(
  inProduction ? {} : { transport: { target: 'pino-pretty' } },
);

const app = express();

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
}, 1000);

// `npm run build` writes the client here.
app.use(express.static('dist'));

app.listen(serverPort, () => {
  const clientUrl = inProduction
    ? `http://localhost:${serverPort}`
    : clientDevUrl;
  logger.info(`server listening on http://localhost:${serverPort}`);
  logger.info(`open a client at ${clientUrl}`);
});
