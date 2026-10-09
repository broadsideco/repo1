const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 180000,
  expect: { timeout: 20000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    viewport: { width: 390, height: 844 },
    headless: true,
    launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] }
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
