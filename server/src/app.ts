import cors from 'cors';
import express, { type Express } from 'express';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { taskRouter } from './tasks/task.routes.js';

/**
 * Builds the Express app without starting it. index.ts calls listen();
 * tests hand the app straight to Supertest, so no real port is needed.
 * Order matters: requests flow top to bottom.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by'); // don't advertise "Express" in response headers
  app.use(cors({ origin: config.CORS_ORIGIN })); // only our frontend may call us from a browser
  app.use(express.json({ limit: '10kb' })); // parse JSON bodies into req.body; reject huge ones

  // Health check for the host (Render) and for us: proves the app AND the DB are up.
  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.use('/api/tasks', taskRouter);

  app.use(notFound); // nothing matched -> 404
  app.use(errorHandler); // must be last
  return app;
}
