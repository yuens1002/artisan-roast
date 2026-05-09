/**
 * Session-5 screenshot verification — uses ?licenseKey= query param
 * so no .env.local edits or server restarts are needed.
 *
 * Usage: node scripts/verify-plans-session5-v3.mjs
 * Requires: dev server running at http://localhost:3000
 *           platform server running at http://localhost:3001
 */

import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'c:/Users/yuens/dev/ecomm-ai-app/.screenshots/provider-plan-sdk-alignment/session5';
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@artisanroast.com';
const ADMIN_PASSWORD = 'ivcF8ZV3FnGaBJ&#8j';

const SCENARIO_KEYS = {
  'dev-free':                    'ar_lic_6aa68d4dd9d551144cc6b56918c5974b3b9f3e3e78919cf8a39179faefdbe40f',
  'dev-pro':                     'ar_lic_816e79542182174e37e075ba6ae923f6dae5d8bb91ce47749f8fdace2151f178',
  'dev-pro-inactive':            'ar_lic_f33eff475d029bf954b2e616dd6df8f8eb39fadb62f66da7b3d6713be20f7ef5',
  'dev-hosted-active-no-card':   'ar_lic_7950203380b54bb177fb265a07c18d5763f77ef42332be65c0320fc75497caa4',
  'dev-hosted-active-card':      'ar_lic_ba646426ee91b18b04ccf08d55284f44122b2ac6b981deb6a52fceaff60d2dab',
  'dev-hosted-expired':          'ar_lic_0a61ebf2007c0f884e300aba6fb99e9969c870fa56e2fc8c391d2cbad0d3c5fd',
  'dev-hosted-converted':        'ar_lic_1ee7dbf1f5a9cf136c5ada7b6c6065c36f23a385c27ea298d98cfba6f8db9298',
  'dev-hosted-cancelled-card':   'ar_lic_680aad7bc14afc3fd1e89e1085c839170758c2cb8ed261b1d287e5cfb3ef4675',
  'dev-hosted-inactive':         'ar_lic_93ce666ee0d0a3e8a04d6e7165556c3960c012ed7f7148ec54fec2c6c2c80c5b',
};

let loggedIn = false;

async function ensureLoggedIn(page) {
  if (loggedIn) return;
  await page.goto(`${BASE_URL}/auth/admin-signin`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', ADMIN_EMAIL);
  await page.$eval('input[type="password"]', (el, pwd) => { el.value = pwd; }, ADMIN_PASSWORD);
  await page.$eval('input[type="password"]', el => el.dispatchEvent(new Event('input', { bubbles: true })));
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.href.includes('/auth/'), { timeout: 15000 });
  loggedIn = true;
  console.log('Logged in ✓');
}

async function screenshotScenario(page, scenarioKey, name) {
  const licenseKey = SCENARIO_KEYS[scenarioKey];
  const url = `${BASE_URL}/admin/support/plans?licenseKey=${encodeURIComponent(licenseKey)}`;
  console.log(`\n=== ${scenarioKey} → ${name} ===`);
  console.log(`URL: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 25000 });

  // Wait for plan cards or "no plans" state
  await page.waitForFunction(
    () => document.querySelectorAll('h3').length > 0 || document.body.textContent.includes('Community Roast') || document.body.textContent.includes('House Blend') || document.body.textContent.includes('Priority Support'),
    { timeout: 10000 }
  ).catch(() => console.warn('  Warning: plan content not detected within timeout'));

  await new Promise(r => setTimeout(r, 1500));

  const outPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  Saved → ${outPath}`);
  return outPath;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await ensureLoggedIn(page);

  const scenarios = [
    { key: 'dev-free',                  name: 'sh-1-dev-free' },
    { key: 'dev-pro',                   name: 'sh-2-dev-pro' },
    { key: 'dev-pro-inactive',          name: 'sh-3-dev-pro-inactive' },
    { key: 'dev-hosted-active-no-card', name: 'ho-1-no-card' },
    { key: 'dev-hosted-active-card',    name: 'ho-2-card' },
    { key: 'dev-hosted-expired',        name: 'ho-3-expired' },
    { key: 'dev-hosted-converted',      name: 'ho-4-converted' },
    { key: 'dev-hosted-cancelled-card', name: 'ho-5-cancelled-card' },
    { key: 'dev-hosted-inactive',       name: 'ho-6-inactive' },
  ];

  for (const s of scenarios) {
    try {
      await screenshotScenario(page, s.key, s.name);
    } catch (err) {
      console.error(`  ERROR for ${s.key}:`, err.message);
      const errPath = path.join(SCREENSHOTS_DIR, `${s.name}-ERROR.png`);
      await page.screenshot({ path: errPath, fullPage: false }).catch(() => {});
    }
  }

  await browser.close();
  console.log('\n✓ All screenshots complete!');
}

main().catch(e => { console.error(e); process.exit(1); });
