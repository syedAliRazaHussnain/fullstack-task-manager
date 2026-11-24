import { migrate } from '../db/migrate.js';
import { pool } from '../db/pool.js';

// CLI entry point: `npm run db:migrate`
try {
  await migrate();
  console.log('Migration complete: tasks table is ready.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end(); // close connections so the process can exit
}
