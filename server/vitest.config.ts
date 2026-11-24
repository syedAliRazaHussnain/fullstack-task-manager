import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests run against a separate database, because they wipe the tasks table.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgresql://tasks:tasks@localhost:5432/tasks_test',
      CORS_ORIGIN: 'http://localhost:5173',
    },
    // One shared database, so test files must not run at the same time.
    fileParallelism: false,
  },
});
