import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,         // sequential files prevents Neon cold-start collisions under concurrent load
  timeout: 120000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    navigationTimeout: 300000,
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
      use: { storageState: undefined },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'next build --webpack && next start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,  // build takes ~2-3 min
  },
})
