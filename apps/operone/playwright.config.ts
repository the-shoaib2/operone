import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1, // Retry once on failure
  workers: 1, // Electron tests must run sequentially
  reporter: [['html'], ['list']],
  
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'electron',
      testMatch: /.*\.electron\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'browser',
      testMatch: /.*\.browser\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
      },
    },
  ],
})
