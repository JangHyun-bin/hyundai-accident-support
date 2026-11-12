import { defineConfig } from '@playwright/test'

// Config is loaded again in workers; inherit the runner's run directory instead of generating another one.
process.env.PLAYWRIGHT_OUTPUT_DIR ??= `test-results/run-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // A concurrent Playwright process must not clean or overwrite another run's evidence.
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR,
  use: {
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1600, height: 1050 },
    trace: 'retain-on-failure',
  },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
})
