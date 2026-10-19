import { defineConfig, devices } from '@playwright/test';

/**
 * Regenerates the README screenshots in docs/screenshots/:
 *   npm run screenshots
 * Kept apart from the e2e suite (different file suffix), so CI never runs it.
 */
export default defineConfig({
  testDir: './e2e/screenshots',
  testMatch: '*.shots.ts',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
