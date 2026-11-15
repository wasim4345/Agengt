import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright — M12 demo script + responsive checks.
 * Serves the static export from `out/` (builds if missing).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
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
    // E2E bridge is compile-time gated; rebuild with the flag so Playwright
    // can use window.__IIMCIP_OS__ without shipping it in production builds.
    command:
      "bash -lc 'NEXT_PUBLIC_ENABLE_E2E_BRIDGE=1 npm run build && npx --yes serve out -l 3000'",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
