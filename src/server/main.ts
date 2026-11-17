import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import express from 'express';
import { builtClient, viteClient } from '#server/clientServing.ts';
import { eventStreamActor } from '#server/eventStream.ts';
import { gameRunnerActor } from '#server/gameRunner.ts';
import { developmentLogger, productionLogger } from '#server/logger.ts';
import { restHandlerRouter } from '#server/restHandler.ts';

const port = 3000;

const inProduction = process.env.NODE_ENV === 'production';
const logger = inProduction ? productionLogger() : developmentLogger();
const clientServing = inProduction ? builtClient : viteClient;

const eventStream = eventStreamActor(
  (message) => gameRunner.actor.send(message),
  logger,
);
const gameRunner = gameRunnerActor(
  (message) => eventStream.actor.send(message),
  logger,
);
const restHandler = restHandlerRouter(logger);

const app = express();
const httpServer = createServer(app);

app.use('/api', express.json());
app.use('/api', restHandler);
app.use('/api', eventStream.router);
app.use('/api', gameRunner.router);
await clientServing.attach(app, httpServer);

httpServer.listen(port, () => {
  const address = httpServer.address();
  if (address === null || typeof address === 'string') {
    throw new Error('the HTTP server listens on no TCP port');
  }
  const listeningPort = address.port;
  const localUrl = `http://localhost:${listeningPort}`;
  logger.info(
    {
      servingMode: inProduction ? 'production' : 'development',
      localUrl,
      networkUrls: networkUrls(listeningPort),
      apiUrl: `${localUrl}/api`,
    },
    `open a client at ${localUrl}`,
  );
});

// The server listens on all interfaces, so a client on another machine
// reaches it through any external IPv4 address of this machine.
function networkUrls(listeningPort: number): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((address) => address?.family === 'IPv4' && !address.internal)
    .map((address) => `http://${address?.address}:${listeningPort}`);
}
