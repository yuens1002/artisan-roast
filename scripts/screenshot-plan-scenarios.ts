/**
 * Screenshot script for provider-plan-sdk-alignment Session 3 ACs.
 *
 * Usage:
 *   MOCK_LICENSE_TIER=pro npx tsx scripts/screenshot-plan-scenarios.ts
 *
 * Requires the dev server to be running with MOCK_LICENSE_TIER set:
 *   MOCK_LICENSE_TIER=pro npm run dev
 */

import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@artisanroast.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ivcF8ZV3FnGaBJ&#8j";
const OUT_DIR = path.join(
  process.cwd(),
  ".screenshots",
  "provider-plan-sdk-alignment-session3"
);

const SCENARIOS = [
  { key: "PRIORITY_SUPPORT_NONE", file: "ps-none.png" },
  { key: "PRIORITY_SUPPORT_ACTIVE", file: "ps-active.png" },
  { key: "PRIORITY_SUPPORT_INACTIVE", file: "ps-inactive.png" },
  { key: "SELF_HOSTED_FREE_WITH_ADDONS", file: "community-addons.png" },
  { key: "TRIAL_ACTIVE_NO_CARD", file: "trial-active-no-card.png" },
  { key: "TRIAL_EXPIRED", file: "trial-expired.png" },
];

async function waitForServer(url: string, retries = 20): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url);
      if (resp.status < 500) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not ready at ${url}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await waitForServer(BASE_URL);

  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Log in with admin credentials
    await page.goto(`${BASE_URL}/auth/admin-signin`, { waitUntil: "networkidle2" });
    await page.type('input[name="email"]', ADMIN_EMAIL);
    await page.type('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForFunction(
      () => !location.href.includes("/auth/"),
      { timeout: 10000 }
    );

    console.log("Logged in, taking scenario screenshots...");

    for (const { key, file } of SCENARIOS) {
      const url = `${BASE_URL}/admin/support/plans?scenario=${key}`;
      await page.goto(url, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 500));

      // Screenshot the plan cards grid only
      const grid = await page.$(".grid.gap-4");
      const outPath = path.join(OUT_DIR, file);
      if (grid) {
        await grid.screenshot({ path: outPath });
      } else {
        // Fallback: viewport screenshot
        await page.screenshot({ path: outPath });
      }
      console.log(`  ✓ ${key} → ${file}`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nScreenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
