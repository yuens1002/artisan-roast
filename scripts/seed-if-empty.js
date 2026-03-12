#!/usr/bin/env node

/**
 * Seed the database if it contains no products.
 * Reusable by build-resilient.js, Docker Compose, and manual invocation.
 *
 * Usage:
 *   node scripts/seed-if-empty.js
 *
 * Environment Variables:
 *   DATABASE_URL - Database connection string
 *   SEED_PRODUCT_MODE - "full" or "minimal" (default: "minimal")
 *   SEED_INCLUDE_USERS - "true" or "false" (default: "false")
 *   SEED_INCLUDE_SYNTHETIC - "true" or "false" (default: "false")
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

const log = {
  info: (msg) => console.log(`[SEED] ℹ️  ${msg}`),
  success: (msg) => console.log(`[SEED] ✅ ${msg}`),
  warn: (msg) => console.warn(`[SEED] ⚠️  ${msg}`),
};

async function main() {
  if (!process.env.DATABASE_URL) {
    log.warn("DATABASE_URL not set, skipping seed check");
    process.exit(0);
  }

  log.info("Checking if database needs seeding...");

  try {
    const result = execSync(
      'npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \\"Product\\";"',
      {
        encoding: "utf-8",
        env: process.env,
        shell: true,
      }
    );

    const match = result.match(/(\d+)/);
    const productCount = match ? parseInt(match[1], 10) : 0;

    if (productCount > 0) {
      log.info(`Database already has ${productCount} products, skipping seed`);
      return;
    }

    log.info("Database is empty, running minimal seed...");
    execSync("npx prisma db seed", {
      stdio: "inherit",
      env: {
        ...process.env,
        SEED_PRODUCT_MODE: process.env.SEED_PRODUCT_MODE || "minimal",
        SEED_INCLUDE_USERS: process.env.SEED_INCLUDE_USERS || "false",
        SEED_INCLUDE_SYNTHETIC: process.env.SEED_INCLUDE_SYNTHETIC || "false",
      },
    });
    log.success("Seed completed");
  } catch (error) {
    log.warn(`Seed check/run failed: ${error.message}`);
    log.warn("You may need to run 'npm run seed' manually");
    // Non-fatal exit
    process.exit(0);
  }
}

main();
