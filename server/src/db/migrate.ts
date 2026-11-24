import { readFile } from 'node:fs/promises';
import { pool } from './pool.js';

/** Reads schema.sql (next to this file) and runs it against the database. */
export async function migrate(): Promise<void> {
  const schemaPath = new URL('./schema.sql', import.meta.url);
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
}
