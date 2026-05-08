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
import { SCENARIOS as SDK_SCENARIOS } from "artisan-roast-sdk/plans/scaffolds";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@artisanroast.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ivcF8ZV3FnGaBJ&#8j";
const OUT_DIR = path.join(
  process.cwd(),
  ".screenshots",
  process.env.SCREENSHOT_DIR ?? "plan-scenarios-all"
);

// All SDK scenarios — covers every plan/state combination
const SCENARIOS = [
  // Self-hosted community plans
  { key: "SELF_HOSTED_FREE",             file: "01-community-none.png" },
  { key: "SELF_HOSTED_FREE_WITH_ADDONS", file: "02-community-addons.png" },
  // Priority Support states
  { key: "PRIORITY_SUPPORT_NONE",        file: "03-ps-none.png" },
  { key: "PRIORITY_SUPPORT_ACTIVE",      file: "04-ps-active.png" },
  { key: "PRIORITY_SUPPORT_INACTIVE",    file: "05-ps-inactive.png" },
  // Trial states
  { key: "TRIAL_ACTIVE_NO_CARD",         file: "06-trial-active-no-card.png" },
  { key: "TRIAL_ACTIVE_CARD_ADDED",      file: "07-trial-active-card-added.png" },
  { key: "TRIAL_EXPIRED",               file: "08-trial-expired.png" },
  // Post-trial / converted states
  { key: "CONVERTED",                   file: "09-converted.png" },
  { key: "DIRECT_SUBSCRIBE",            file: "10-direct-subscribe.png" },
  { key: "INACTIVE",                    file: "11-inactive.png" },
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
  // Fail fast if any scenario key is not in the SDK — prevents silent
  // wrong-image generation when a scenario is renamed or removed.
  const unknownKeys = SCENARIOS.filter(({ key }) => !(key in SDK_SCENARIOS));
  if (unknownKeys.length > 0) {
    console.error(
      `Unknown scenario keys (not in SDK SCENARIOS): ${unknownKeys.map((s) => s.key).join(", ")}`
    );
    process.exit(1);
  }

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
