#!/usr/bin/env npx tsx
/**
 * AC Verification — Admin Order Detail Page
 *
 * 1. Signs in as demo admin via demo button
 * 2. Navigates to /admin/orders, finds first order ID via double-click
 * 3. Screenshots admin order detail at desktop + mobile
 * 4. Screenshots print preview
 * 5. Tests 404 for non-existent order
 * 6. Signs out, signs in as demo customer
 * 7. Screenshots storefront order detail at desktop + mobile
 *
 * Usage: npx tsx scripts/verify-order-detail.ts
 */

import puppeteer, { type Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, ".screenshots", "order-detail");

const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function demoSignIn(page: Page, accountType: "admin" | "customer") {
  const signinPath =
    accountType === "admin" ? "/auth/admin-signin" : "/auth/signin";
  console.log(`\n--- Signing in as demo ${accountType}...`);
  await page.goto(`${BASE_URL}${signinPath}`, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await wait(1000);

  // Find the demo sign-in button by text
  const buttonLabel =
    accountType === "admin" ? "Sign in as Admin" : "Sign in as Demo Customer";

  const buttons = await page.$$("button");
  let clicked = false;
  for (const btn of buttons) {
    const text = await btn.evaluate((el) => el.textContent || "");
    if (text.includes(buttonLabel)) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
        btn.click(),
      ]);
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    console.error(
      `ERROR: Could not find demo button "${buttonLabel}" on ${signinPath}`
    );
    process.exit(1);
  }

  await wait(2000);
  console.log(`  Signed in as ${accountType} — URL: ${page.url()}`);
}

async function signOut(page: Page) {
  console.log("\n--- Signing out...");
  await page.goto(`${BASE_URL}/api/auth/signout`, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  // NextAuth signout page has a confirmation button
  const confirmBtn = await page.$('button[type="submit"]');
  if (confirmBtn) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
      confirmBtn.click(),
    ]);
  }
  await wait(1000);
  console.log("  Signed out");
}

async function screenshot(page: Page, name: string) {
  const filePath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  Screenshot: ${name}.png`);
}

async function main() {
  ensureDir(OUT_DIR);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // === ADMIN FLOW ===
    await demoSignIn(page, "admin");

    // Step 1: Go to admin orders, extract first order ID via double-click
    console.log("\n--- Finding order ID from admin orders table...");
    await page.setViewport(DESKTOP);
    await page.goto(`${BASE_URL}/admin/orders`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await wait(2000);

    const firstRow = await page.$('tr[title="Double-click to view order"]');
    if (!firstRow) {
      console.error(
        "ERROR: No double-clickable rows found. Ensure orders exist in DB."
      );
      process.exit(1);
    }

    await firstRow.click({ count: 2 });
    await wait(3000);

    const navUrl = page.url();
    const urlMatch = navUrl.match(/\/admin\/orders\/(.+)/);
    if (!urlMatch) {
      console.error(
        `ERROR: Double-click did not navigate. Current URL: ${navUrl}`
      );
      process.exit(1);
    }

    const testOrderId = urlMatch[1];
    console.log(
      `  AC-NAV-1 PASS: Double-click navigated to /admin/orders/${testOrderId}`
    );

    // Step 2: Admin order detail - Desktop
    console.log(
      `\n--- Admin Order Detail (desktop) - /admin/orders/${testOrderId}`
    );
    await page.setViewport(DESKTOP);
    await page.goto(`${BASE_URL}/admin/orders/${testOrderId}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await wait(1500);
    await screenshot(page, "admin-detail-desktop");

    // Step 3: Admin order detail - Mobile
    console.log("\n--- Admin Order Detail (mobile 375px)");
    await page.setViewport(MOBILE);
    await wait(500);
    await screenshot(page, "admin-detail-mobile");

    // Step 4: Print preview (emulate print media)
    console.log("\n--- Print preview (emulating print media)");
    await page.setViewport(DESKTOP);
    await page.emulateMediaType("print");
    await wait(500);
    await screenshot(page, "admin-detail-print");
    await page.emulateMediaType("screen");

    // Step 5: 404 test
    console.log("\n--- 404 test - /admin/orders/nonexistent-id");
    await page.setViewport(DESKTOP);
    const response = await page.goto(
      `${BASE_URL}/admin/orders/nonexistent-id-12345`,
      {
        waitUntil: "networkidle2",
        timeout: 30000,
      }
    );
    await wait(1000);
    const status = response?.status() || 0;
    console.log(`  HTTP status: ${status}`);
    await screenshot(page, "admin-detail-404");

    // Step 6: Admin orders table screenshot
    console.log("\n--- Admin orders table - cursor pointer check");
    await page.setViewport(DESKTOP);
    await page.goto(`${BASE_URL}/admin/orders`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await wait(2000);
    await screenshot(page, "admin-orders-table");

    // === STOREFRONT FLOW ===
    await signOut(page);
    await demoSignIn(page, "customer");

    // Step 7: Find a customer-owned order
    console.log("\n--- Finding customer order from /orders...");
    await page.setViewport(DESKTOP);
    await page.goto(`${BASE_URL}/orders`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await wait(2000);
    await screenshot(page, "storefront-orders-list");

    // Try to find an order link on the page
    const orderLink = await page.$('a[href^="/orders/"]');
    if (!orderLink) {
      console.warn(
        "WARNING: No order links found on /orders. Demo customer may have no orders."
      );
      console.log("  Skipping storefront detail screenshots.");
    } else {
      const href = await orderLink.evaluate((el) =>
        el.getAttribute("href")
      );
      console.log(`  Found order link: ${href}`);

      // Step 8: Storefront order detail - Desktop
      console.log(`\n--- Storefront Order Detail (desktop) - ${href}`);
      await page.setViewport(DESKTOP);
      await page.goto(`${BASE_URL}${href}`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await wait(1500);
      await screenshot(page, "storefront-detail-desktop");

      // Step 9: Storefront order detail - Mobile
      console.log("\n--- Storefront Order Detail (mobile 375px)");
      await page.setViewport(MOBILE);
      await wait(500);
      await screenshot(page, "storefront-detail-mobile");
    }

    console.log("\n--- All screenshots captured successfully!");
    console.log(`  Output: ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
