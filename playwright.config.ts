import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright scaffolding for later demo-script smoke tests (M12).
 * M0 does not require e2e green — unit tests + static build are the gate.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start:static",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});
