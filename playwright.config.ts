import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env.local if it exists (for worktree-specific port configuration)
dotenv.config({ path: '.env.local' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000, // 60 second timeout per test to prevent hangs
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
    },
  },
  projects: [
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13 Pro'] },
    },
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000, // Reduced from 120s to 30s to fail faster on CI
  },
});
