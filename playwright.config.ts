import { defineConfig } from '@playwright/test';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
if (
  !['localhost', '127.0.0.1'].includes(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost').hostname,
  )
) {
  throw new Error('Integration tests must use an isolated local Supabase instance.');
}
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3020',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  reporter: [['list']],
  webServer: process.env.E2E_SKIP_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3020',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
