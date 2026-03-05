#!/usr/bin/env npx tsx
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:8000";
const DIR = path.join(__dirname, "..", ".screenshots", "sales-analytics-iter-1");

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Login
  console.log("Logging in...");
  await page.goto(`${BASE_URL}/auth/signin`, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 1000));
  if (page.url().includes("/auth/signin")) {
    await page.type("#email", "admin@artisanroast.com");
    await page.type("#password", "ivcF8ZV3FnGaBJ&#8j");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    await new Promise((r) => setTimeout(r, 2000));
    console.log("  Logged in");
  } else {
    console.log("  Already logged in");
  }

  // Desktop
  console.log("Desktop screenshot...");
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/admin/sales`, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 4000));

  await page.screenshot({
    path: path.join(DIR, "desktop-with-table.png"),
    fullPage: true,
  });
  console.log("  ✓ desktop-with-table.png");

  // Orders table card
  const handle = await page.evaluateHandle(() => {
    const titles = document.querySelectorAll('[data-slot="card-title"]');
    for (const t of titles) {
      if (t.textContent?.trim() === "Orders") {
        return t.closest('[data-slot="card"]');
      }
    }
    return null;
  });
  const el = handle.asElement();
  if (el) {
    await el.screenshot({
      path: path.join(DIR, "desktop-orders-table.png"),
    });
    console.log("  ✓ desktop-orders-table.png");
  } else {
    console.log("  ✗ Orders table card not found");
  }

  // Mobile
  console.log("Mobile screenshot...");
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE_URL}/admin/sales`, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({
    path: path.join(DIR, "mobile-with-table.png"),
    fullPage: true,
  });
  console.log("  ✓ mobile-with-table.png");

  await browser.close();
  console.log("Done");
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
