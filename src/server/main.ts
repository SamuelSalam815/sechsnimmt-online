import { createServer } from 'node:http';
import express from 'express';
import { builtClient, viteClient } from '#server/clientServing.ts';
import { counterActor } from '#server/counter.ts';
import {
  developmentLogger,
  loggerActor,
  logRequests,
  productionLogger,
} from '#server/logger.ts';
import { webAppActor } from '#server/webApp.ts';

const port = 3000;

const inProduction = process.env.NODE_ENV === 'production';
const logger = loggerActor(
  inProduction ? productionLogger() : developmentLogger(),
);
const clientServing = inProduction ? builtClient : viteClient;

const webApp = webAppActor((message) => counter.send(message), logger);
const counter = counterActor((message) => webApp.actor.send(message), logger);

const app = express();
const httpServer = createServer(app);

app.use(logRequests(logger));
app.use('/api', webApp.router);
await clientServing.attach(app, httpServer);

httpServer.listen(port, () => {
  logger.send({ type: 'logger/listening', port });
});
