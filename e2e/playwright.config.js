import { defineConfig, devices } from '@playwright/test';

const BACKEND_PORT = 4011;
const FRONTEND_PORT = 5174;

export default defineConfig({
  testDir: './tests',
  workers: 1,
  retries: 0,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    timezoneId: 'UTC',
    locale: 'en-GB',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command:
        'rm -f data/e2e.db data/e2e.db-wal data/e2e.db-shm && DB_FILE=data/e2e.db PORT=4011 npx tsx src/server.ts',
      cwd: '../backend',
      url: `http://127.0.0.1:${BACKEND_PORT}/api/owners/owner-1/event-types`,
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'API_TARGET=http://127.0.0.1:4011 npm run dev -- --host 127.0.0.1',
      cwd: '../frontend',
      url: `http://127.0.0.1:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
