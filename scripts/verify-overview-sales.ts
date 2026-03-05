#!/usr/bin/env npx tsx
/**
 * AC Verification — Overview Makeover + Sales Analytics
 *
 * Captures targeted element screenshots at mobile (375x812) and desktop (1440x900)
 * for both /admin (overview) and /admin/sales pages.
 *
 * Tests: period selector interaction, comparison toggle, data rendering.
 *
 * Usage: BASE_URL=http://localhost:8000 npx tsx scripts/verify-overview-sales.ts
 */

import puppeteer, { type Page, type Browser } from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:8000";
const ROOT = path.join(__dirname, "..");
const OVERVIEW_DIR = path.join(ROOT, ".screenshots", "overview-makeover-iter-1");
const SALES_DIR = path.join(ROOT, ".screenshots", "sales-analytics-iter-1");

const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

const ADMIN_EMAIL = "admin@artisanroast.com";
const ADMIN_PASSWORD = "ivcF8ZV3FnGaBJ&#8j";

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function login(page: Page) {
  console.log("\n🔐 Logging in as admin...");
  await page.goto(`${BASE_URL}/auth/signin`, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await wait(1000);

  // Check if already logged in (redirected away from signin)
  if (!page.url().includes("/auth/signin")) {
    console.log("  ✓ Already logged in (session active)");
    return;
  }

  await page.type("#email", ADMIN_EMAIL);
  await page.type("#password", ADMIN_PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await wait(2000);
  console.log("  ✓ Logged in");
}

async function screenshotFull(page: Page, dir: string, name: string) {
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  ✓ ${name}.png (full page)`);
}

async function screenshotEl(
  page: Page,
  dir: string,
  name: string,
  selector: string
): Promise<boolean> {
  const el = await page.$(selector);
  if (!el) {
    console.log(`  ⚠ ${name} — selector "${selector}" not found`);
    return false;
  }
  const filePath = path.join(dir, `${name}.png`);
  await el.screenshot({ path: filePath });
  console.log(`  ✓ ${name}.png`);
  return true;
}

/**
 * Find a Card (data-slot="card") by the text of its CardTitle (data-slot="card-title").
 */
async function screenshotCardByTitle(
  page: Page,
  dir: string,
  name: string,
  titleText: string
): Promise<boolean> {
  const handle = await page.evaluateHandle((title: string) => {
    const titles = document.querySelectorAll('[data-slot="card-title"]');
    for (const t of titles) {
      if (t.textContent?.trim() === title) {
        return t.closest('[data-slot="card"]');
      }
    }
    return null;
  }, titleText);

  const el = handle.asElement();
  if (!el) {
    console.log(`  ⚠ ${name} — card titled "${titleText}" not found`);
    return false;
  }
  const filePath = path.join(dir, `${name}.png`);
  await el.screenshot({ path: filePath });
  console.log(`  ✓ ${name}.png`);
  return true;
}

/**
 * Tag an element with data-verify attribute via JS, then screenshot by that tag.
 */
async function tagAndScreenshot(
  page: Page,
  dir: string,
  name: string,
  tagFn: () => boolean
): Promise<boolean> {
  const tagged = await page.evaluate(tagFn);
  if (!tagged) {
    console.log(`  ⚠ ${name} — element not found by evaluator`);
    return false;
  }
  return screenshotEl(page, dir, name, `[data-verify="${name}"]`);
}

async function setViewport(page: Page, vp: { width: number; height: number }) {
  await page.setViewport(vp);
  await wait(500);
}

// ─── OVERVIEW PAGE VERIFICATION ──────────────────────────────────────

async function verifyOverview(page: Page) {
  console.log("\n════════════════════════════════════════");
  console.log("  OVERVIEW PAGE (/admin)");
  console.log("════════════════════════════════════════");

  // ── DESKTOP ─────────────────────────────────────────────
  console.log("\n📐 Desktop (1440x900):");
  await setViewport(page, DESKTOP);
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(3000);

  await screenshotFull(page, OVERVIEW_DIR, "desktop-full-page");

  // AC-UI-3: Period selector
  await screenshotEl(page, OVERVIEW_DIR, "desktop-period-selector", 'div[role="group"][aria-label="Period selection"]');

  // AC-UI-4: Alert strip (hidden if no alerts, which is expected with low refund rate)
  const alertFound = await screenshotEl(page, OVERVIEW_DIR, "desktop-alert-strip", 'div[role="alert"]');
  if (!alertFound) console.log("    (expected: no alerts when refund rate < 10%)");

  // AC-UI-1: 6 KPI cards — StatGrid with 6 children
  await tagAndScreenshot(page, OVERVIEW_DIR, "desktop-kpi-cards", () => {
    const grids = document.querySelectorAll('.grid.gap-4');
    for (const g of grids) {
      // StatGrid renders grid with KpiCard children (each is an <a> or <div> with data-slot="card")
      const cards = g.querySelectorAll('[data-slot="card"]');
      if (cards.length === 6) {
        (g as HTMLElement).setAttribute("data-verify", "desktop-kpi-cards");
        return true;
      }
    }
    return false;
  });

  // AC-UI-5: Chip bar
  await screenshotEl(page, OVERVIEW_DIR, "desktop-chip-bar", 'div[role="list"][aria-label="Supporting metrics"]');

  // AC-UI-6: Revenue & Orders Trend
  await screenshotCardByTitle(page, OVERVIEW_DIR, "desktop-revenue-trend", "Revenue & Orders Trend");

  // AC-UI-7: Orders by Status
  await screenshotCardByTitle(page, OVERVIEW_DIR, "desktop-orders-status", "Orders by Status");

  // AC-UI-8: Conversion Funnel
  await screenshotCardByTitle(page, OVERVIEW_DIR, "desktop-conversion-funnel", "Conversion Funnel");

  // AC-UI-9: Mix & Retention
  await screenshotCardByTitle(page, OVERVIEW_DIR, "desktop-mix-retention", "Mix & Retention");

  // Reviews
  await screenshotCardByTitle(page, OVERVIEW_DIR, "desktop-reviews", "Reviews");

  // AC-UI-10: Top movers — 3 cards (Top Products, Top Locations, Top Searches)
  await screenshotCardByTitle(page, OVERVIEW_DIR, "desktop-top-products", "Top Products");
  await screenshotCardByTitle(page, OVERVIEW_DIR, "desktop-top-locations", "Top Locations");
  await screenshotCardByTitle(page, OVERVIEW_DIR, "desktop-top-searches", "Top Searches");

  // ── INTERACTION: Period preset click ─────────────────────
  console.log("\n🔄 Period selector interaction...");
  // Button text is "7 days" not "7d"
  const clicked7d = await page.evaluate(() => {
    const buttons = document.querySelectorAll('div[role="group"][aria-label="Period selection"] button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === "7 days") {
        (btn as HTMLButtonElement).click();
        return true;
      }
    }
    return false;
  });
  if (clicked7d) {
    await wait(3000);
    await screenshotFull(page, OVERVIEW_DIR, "desktop-after-7d-click");
    const url = page.url();
    console.log(`  ${url.includes("period=7d") ? "✓" : "✗"} URL has period=7d: ${url}`);
  } else {
    console.log("  ✗ '7 days' button not found");
  }

  // ── INTERACTION: Comparison toggle via URL ───────────────
  console.log("\n🔄 Comparison mode (via URL)...");
  await page.goto(`${BASE_URL}/admin?period=30d&compare=previous`, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(3000);
  await screenshotFull(page, OVERVIEW_DIR, "desktop-comparison-enabled");

  // AC-UI-2: Check for delta badges on KPI cards
  const deltaInfo = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-slot="card"]');
    let withDelta = 0;
    for (const card of cards) {
      // Delta badges render as small colored elements near the KPI value
      const text = card.textContent || "";
      if (text.includes("%") || text.includes("↑") || text.includes("↓") || text.includes("+") || text.includes("-")) {
        withDelta++;
      }
    }
    return { totalCards: cards.length, withDeltaHints: withDelta };
  });
  console.log(`  Cards: ${deltaInfo.totalCards}, cards with delta hints: ${deltaInfo.withDeltaHints}`);

  // Re-screenshot KPI cards with comparison visible
  await tagAndScreenshot(page, OVERVIEW_DIR, "desktop-kpi-cards-comparison", () => {
    const grids = document.querySelectorAll('.grid.gap-4');
    for (const g of grids) {
      const cards = g.querySelectorAll('[data-slot="card"]');
      if (cards.length === 6) {
        (g as HTMLElement).setAttribute("data-verify", "desktop-kpi-cards-comparison");
        return true;
      }
    }
    return false;
  });

  // "none" comparison
  await page.goto(`${BASE_URL}/admin?period=30d&compare=none`, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(3000);
  await screenshotFull(page, OVERVIEW_DIR, "desktop-comparison-none");

  // "lastYear" comparison
  await page.goto(`${BASE_URL}/admin?period=30d&compare=lastYear`, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(3000);
  await screenshotFull(page, OVERVIEW_DIR, "desktop-comparison-lastYear");

  // ── MOBILE ─────────────────────────────────────────────
  console.log("\n📱 Mobile (375x812):");
  await setViewport(page, MOBILE);
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(3000);
  await screenshotFull(page, OVERVIEW_DIR, "mobile-full-page");

  await page.goto(`${BASE_URL}/admin?compare=previous`, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(3000);
  await screenshotFull(page, OVERVIEW_DIR, "mobile-comparison-enabled");

  // ── DATA VALIDATION ────────────────────────────────────
  console.log("\n📊 Dashboard API validation...");
  const apiData = await page.evaluate(async (baseUrl: string) => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard?period=30d&compare=previous`);
    if (!res.ok) return { error: res.status };
    return res.json();
  }, BASE_URL);

  if ("error" in apiData) {
    console.log(`  ✗ API error: ${apiData.error}`);
  } else {
    console.log("  ✓ Dashboard API OK");
    console.log("    Keys:", Object.keys(apiData).join(", "));
    console.log("    KPIs:", JSON.stringify(apiData.kpis));
    console.log("    comparisonKpis:", !!apiData.comparisonKpis);
    console.log("    revenueByDay:", apiData.revenueByDay?.length, "points");
    console.log("    ordersByStatus:", apiData.ordersByStatus?.length, "items");
    console.log("    topProducts:", apiData.topProducts?.length);
    console.log("    topLocations:", apiData.topLocations?.length);
    console.log("    topSearches:", apiData.topSearches?.length);
    console.log("    chips:", apiData.chips?.length);
    console.log("    alerts:", apiData.alerts?.length);
    console.log("    behaviorFunnel:", JSON.stringify(apiData.behaviorFunnel));
    console.log("    subscriptionSplit:", JSON.stringify(apiData.subscriptionSplit));
    console.log("    customerSplit:", JSON.stringify(apiData.customerSplit));
    console.log("    reviewsSummary:", JSON.stringify(apiData.reviewsSummary));
  }
}

// ─── SALES PAGE VERIFICATION ─────────────────────────────────────────

async function verifySales(page: Page) {
  console.log("\n════════════════════════════════════════");
  console.log("  SALES PAGE (/admin/sales)");
  console.log("════════════════════════════════════════");

  // ── DESKTOP ─────────────────────────────────────────────
  console.log("\n📐 Desktop (1440x900):");
  await setViewport(page, DESKTOP);
  await page.goto(`${BASE_URL}/admin/sales`, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(4000);

  await screenshotFull(page, SALES_DIR, "desktop-full-page");

  // AC-UI-1: Page header with title + Export CSV button
  await tagAndScreenshot(page, SALES_DIR, "desktop-page-header", () => {
    const h1 = document.querySelector("h1");
    if (h1 && h1.textContent?.includes("Sales")) {
      const parent = h1.closest("div");
      if (parent) {
        parent.setAttribute("data-verify", "desktop-page-header");
        return true;
      }
    }
    return false;
  });

  // AC-UI-2: Period selector (state mode)
  await screenshotEl(page, SALES_DIR, "desktop-period-selector", 'div[role="group"][aria-label="Period selection"]');

  // AC-UI-3: 5 KPI cards
  await tagAndScreenshot(page, SALES_DIR, "desktop-kpi-cards", () => {
    const grids = document.querySelectorAll('.grid.gap-4');
    for (const g of grids) {
      const cards = g.querySelectorAll('[data-slot="card"]');
      if (cards.length === 5) {
        (g as HTMLElement).setAttribute("data-verify", "desktop-kpi-cards");
        return true;
      }
    }
    return false;
  });

  // AC-UI-4: Revenue Over Time
  await screenshotCardByTitle(page, SALES_DIR, "desktop-revenue-trend", "Revenue Over Time");

  // AC-UI-5: Top Products + Category Breakdown
  await screenshotCardByTitle(page, SALES_DIR, "desktop-top-products", "Top Products");
  await screenshotCardByTitle(page, SALES_DIR, "desktop-category-breakdown", "Category Breakdown");

  // AC-UI-6: Orders by Status + Subscription split
  await screenshotCardByTitle(page, SALES_DIR, "desktop-orders-status", "Orders by Status");
  await screenshotCardByTitle(page, SALES_DIR, "desktop-subscription-split", "Subscription vs One-time");

  // AC-UI-7: Location + Coffee by Weight
  await screenshotCardByTitle(page, SALES_DIR, "desktop-sales-location", "Sales by Location");
  await screenshotCardByTitle(page, SALES_DIR, "desktop-coffee-weight", "Coffee Sold by Weight");

  // ── INTERACTION: SWR period switch ─────────────────────
  console.log("\n🔄 SWR period switch...");
  const urlBefore = page.url();
  const clicked7d = await page.evaluate(() => {
    const buttons = document.querySelectorAll('div[role="group"][aria-label="Period selection"] button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === "7 days") {
        (btn as HTMLButtonElement).click();
        return true;
      }
    }
    return false;
  });
  if (clicked7d) {
    await wait(3000);
    await screenshotFull(page, SALES_DIR, "desktop-after-7d-switch");
    const urlAfter = page.url();
    console.log(`  ${urlBefore === urlAfter ? "✓" : "✗"} URL unchanged (state mode)`);
  }

  // Switch to 90d
  const clicked90d = await page.evaluate(() => {
    const buttons = document.querySelectorAll('div[role="group"][aria-label="Period selection"] button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === "90 days") {
        (btn as HTMLButtonElement).click();
        return true;
      }
    }
    return false;
  });
  if (clicked90d) {
    await wait(3000);
    await screenshotFull(page, SALES_DIR, "desktop-after-90d-switch");
    console.log("  ✓ Switched to 90d");
  }

  // Switch to 1yr
  const clicked1yr = await page.evaluate(() => {
    const buttons = document.querySelectorAll('div[role="group"][aria-label="Period selection"] button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === "1 year") {
        (btn as HTMLButtonElement).click();
        return true;
      }
    }
    return false;
  });
  if (clicked1yr) {
    await wait(3000);
    await screenshotFull(page, SALES_DIR, "desktop-after-1yr-switch");
    console.log("  ✓ Switched to 1yr");
  }

  // ── MOBILE ─────────────────────────────────────────────
  console.log("\n📱 Mobile (375x812):");
  await setViewport(page, MOBILE);
  await page.goto(`${BASE_URL}/admin/sales`, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(4000);
  await screenshotFull(page, SALES_DIR, "mobile-full-page");

  // ── DATA VALIDATION ────────────────────────────────────
  console.log("\n📊 Sales API validation...");
  const salesApi = await page.evaluate(async (baseUrl: string) => {
    const res = await fetch(`${baseUrl}/api/admin/sales?period=30d&compare=previous`);
    if (!res.ok) return { error: res.status, body: await res.text().catch(() => "") };
    return res.json();
  }, BASE_URL);

  if ("error" in salesApi) {
    console.log(`  ✗ API error: ${salesApi.error}`);
  } else {
    console.log("  ✓ Sales API OK");
    console.log("    Keys:", Object.keys(salesApi).join(", "));
    console.log("    KPIs:", JSON.stringify(salesApi.kpis));
    console.log("    comparisonKpis:", !!salesApi.comparisonKpis);
    console.log("    revenueByDay:", salesApi.revenueByDay?.length, "points");
    console.log("    topProducts:", salesApi.topProducts?.length);
    console.log("    categoryBreakdown:", salesApi.categoryBreakdown?.length);
    console.log("    salesByLocation:", salesApi.salesByLocation?.length);
    console.log("    purchaseTypeSplit:", JSON.stringify(salesApi.purchaseTypeSplit));
    console.log("    coffeeByWeight:", salesApi.coffeeByWeight?.length);
    console.log("    table:", salesApi.table?.rows?.length, "rows /", salesApi.table?.total, "total");
    if (salesApi.comparisonByDay) {
      console.log("    comparisonByDay:", salesApi.comparisonByDay.length, "points");
    }
  }

  // ── CSV EXPORT TEST ────────────────────────────────────
  console.log("\n📤 CSV export test...");
  const csv = await page.evaluate(async (baseUrl: string) => {
    const res = await fetch(`${baseUrl}/api/admin/sales?period=30d&export=csv`);
    const ct = res.headers.get("Content-Type");
    const cd = res.headers.get("Content-Disposition");
    const text = await res.text();
    const lines = text.split("\n").filter(Boolean);
    return { status: res.status, contentType: ct, disposition: cd, header: lines[0], rows: lines.length - 1, sample: lines[1] ?? "" };
  }, BASE_URL);
  console.log(`  Status: ${csv.status}`);
  console.log(`  Content-Type: ${csv.contentType}`);
  console.log(`  Disposition: ${csv.disposition}`);
  console.log(`  Header: ${csv.header}`);
  console.log(`  Rows: ${csv.rows}`);
  if (csv.sample) console.log(`  Sample: ${csv.sample}`);

  // ── COMPARISON MODES via API ──────────────────────────
  console.log("\n🔄 Comparison modes (API)...");
  for (const mode of ["none", "previous", "lastYear"]) {
    const res = await page.evaluate(async (baseUrl: string, cmp: string) => {
      const r = await fetch(`${baseUrl}/api/admin/sales?period=30d&compare=${cmp}`);
      if (!r.ok) return { mode: cmp, error: r.status };
      const d = await r.json();
      return { mode: cmp, hasComparisonKpis: !!d.comparisonKpis, hasComparisonByDay: !!d.comparisonByDay, revenue: d.kpis?.revenue };
    }, BASE_URL, mode);
    console.log(`  ${mode}:`, JSON.stringify(res));
  }

  // ── PERIOD RANGES via API ─────────────────────────────
  console.log("\n🔄 Period ranges (API)...");
  for (const period of ["7d", "30d", "90d", "6mo", "1yr"]) {
    const res = await page.evaluate(async (baseUrl: string, p: string) => {
      const r = await fetch(`${baseUrl}/api/admin/sales?period=${p}&compare=none`);
      if (!r.ok) return { period: p, error: r.status };
      const d = await r.json();
      return { period: p, revenue: d.kpis?.revenue, orders: d.kpis?.orders, chartPoints: d.revenueByDay?.length, tableTotal: d.table?.total };
    }, BASE_URL, period);
    console.log(`  ${period}:`, JSON.stringify(res));
  }
}

// ─── NAV VERIFICATION ────────────────────────────────────────────────

async function verifyNav(page: Page) {
  console.log("\n════════════════════════════════════════");
  console.log("  ADMIN NAV");
  console.log("════════════════════════════════════════");

  await setViewport(page, DESKTOP);
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(2000);

  const navLinks = await page.evaluate(() => {
    const links = document.querySelectorAll("nav a, aside a, [role='navigation'] a");
    return Array.from(links).map(a => ({
      text: a.textContent?.trim(),
      href: (a as HTMLAnchorElement).getAttribute("href"),
    })).filter(l => l.text);
  });
  console.log("  Nav links:");
  for (const l of navLinks) {
    const marker = l.text === "Sales" ? " ← AC-FN-11" : "";
    console.log(`    ${l.text}: ${l.href}${marker}`);
  }
  const hasSales = navLinks.some(l => l.text === "Sales" && l.href === "/admin/sales");
  console.log(`\n  ${hasSales ? "✓ PASS" : "✗ FAIL"}: Sales nav entry with href=/admin/sales`);

  await screenshotEl(page, OVERVIEW_DIR, "desktop-admin-nav", "aside");
}

// ─── MAIN ────────────────────────────────────────────────────────────

async function run() {
  ensureDir(OVERVIEW_DIR);
  ensureDir(SALES_DIR);

  console.log("🔍 AC Verification — Overview Makeover + Sales Analytics");
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📁 Overview: ${OVERVIEW_DIR}`);
  console.log(`📁 Sales: ${SALES_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    // Share a single page (session) across all verifications
    const page = await browser.newPage();
    await login(page);

    await verifyOverview(page);
    await verifySales(page);
    await verifyNav(page);

    await page.close();
  } catch (err) {
    console.error("\n❌ Verification error:", err);
  } finally {
    await browser.close();
    console.log("\n════════════════════════════════════════");
    console.log("  DONE");
    console.log("════════════════════════════════════════");
  }
}

run();
