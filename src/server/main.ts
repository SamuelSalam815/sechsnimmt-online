import { createServer } from 'node:http';
import express from 'express';
import { builtClient, viteClient } from '#server/clientServing.ts';
import { counterActor } from '#server/counter.ts';
import { eventStreamActor } from '#server/eventStream.ts';
import {
  developmentLogger,
  logRequests,
  productionLogger,
} from '#server/logger.ts';
import { restHandlerRouter } from '#server/restHandler.ts';

const port = 3000;

const inProduction = process.env.NODE_ENV === 'production';
const logger = inProduction ? productionLogger() : developmentLogger();
const clientServing = inProduction ? builtClient : viteClient;

const eventStream = eventStreamActor(
  (message) => counter.send(message),
  logger,
);
const counter = counterActor(
  (message) => eventStream.actor.send(message),
  logger,
);
const restHandler = restHandlerRouter(logger);

const app = express();
const httpServer = createServer(app);

app.use(logRequests(logger));
app.use('/api', restHandler);
app.use('/api', eventStream.router);
await clientServing.attach(app, httpServer);

httpServer.listen(port, () => {
  logger.info(`open a client at http://localhost:${port}`);
});
