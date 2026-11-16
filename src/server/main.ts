import { createServer } from 'node:http';
import express from 'express';
import { builtClient, viteClient } from '#server/clientServing.ts';
import { counterRouter } from '#server/counter.ts';
import {
  developmentLogger,
  logRequests,
  productionLogger,
} from '#server/logger.ts';

const port = 3000;

const inProduction = process.env.NODE_ENV === 'production';
const logger = inProduction ? productionLogger() : developmentLogger();
const clientServing = inProduction ? builtClient : viteClient;

const app = express();
const httpServer = createServer(app);

app.use(logRequests(logger));
app.get('/api/ping', (_request, response) => {
  response.json({ message: 'pong' });
});
app.use('/api/counter', counterRouter(logger));
await clientServing.attach(app, httpServer);

httpServer.listen(port, () => {
  logger.info(`open a client at http://localhost:${port}`);
});
