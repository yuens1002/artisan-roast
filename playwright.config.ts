import dotenv from "dotenv";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Load .env so globalSetup and any env reads have DATABASE_URL available
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: true });

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "html" : "list",
  timeout: 60_000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Auth setup — runs first, saves storage state
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // E2E tests — uses saved auth state
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: [
    {
      command: "node e2e/mock-platform.mjs",
      port: 9999,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev -- --port 3000",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PLATFORM_URL: "http://localhost:9999",
        // Prevent .env.local / CI env overrides from leaking into the test server
        NEXT_PUBLIC_BUILD_VARIANT: "",
        MOCK_LICENSE_TIER: "",
        // Non-empty so fetchResolvedPlans() actually hits the mock's
        // /api/plans/resolved (it short-circuits to [] when LICENSE_KEY is unset).
        // validateLicense() still returns FREE via forceFreeTierForTest() — the
        // license tier is independent of whether the plans resolver is called.
        LICENSE_KEY: "e2e-test-key",
      },
    },
  ],
});
