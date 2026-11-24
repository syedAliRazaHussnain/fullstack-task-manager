import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';

const app = createApp();

const server = app.listen(config.PORT, (error) => {
  if (error) throw error; // e.g. port already in use
  console.log(`API listening on http://localhost:${config.PORT}`);
});

/**
 * Graceful shutdown: hosts like Render send SIGTERM before replacing the server.
 * Stop accepting new requests, let in-flight ones finish, close DB connections, exit.
 */
function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
