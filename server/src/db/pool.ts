import pg from 'pg';
import { config } from '../config.js';

/**
 * One shared pool of Postgres connections for the whole app.
 * Each query borrows a connection and gives it back when done,
 * so we don't open a new connection per request.
 */
export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10, // at most 10 open connections at once
});

// An idle connection can drop (e.g. the DB restarts). Log it instead of
// letting the unhandled 'error' event crash the process.
pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});
