import type { Server } from 'node:http';
import express, { type Express } from 'express';

export interface ClientServing {
  attach(app: Express, httpServer: Server): Promise<void>;
}

export const builtClient: ClientServing = {
  async attach(app) {
    // `npm run build` writes the client here.
    app.use(express.static('dist'));
  },
};

export const viteClient: ClientServing = {
  async attach(app, httpServer) {
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
  },
};
