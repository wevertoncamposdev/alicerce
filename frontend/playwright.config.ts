import { defineConfig, devices } from '@playwright/test';

// Etapa 12.1 (ADR 0013) — smoke contra o build de produção (`next build &&
// next start`), não o dev server: é o único jeito de ver a CSP de verdade
// (dev relaxa `script-src` com `'unsafe-eval'` pro HMR do Turbopack — ver
// next.config.ts `buildCsp()`). Precisa do backend real no ar em
// http://localhost:5000 (não iniciado por este config — ver README/CI).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-375',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
