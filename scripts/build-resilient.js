#!/usr/bin/env node

/**
 * Resilient build script for cross-instance deployments
 * Handles database connection issues, timeouts, and lock acquisition
 *
 * Usage:
 *   node scripts/build-resilient.js [--no-migrate] [--direct-url=<url>]
 *
 * Environment Variables:
 *   DIRECT_URL - Direct database URL (bypasses connection pool)
 *   DATABASE_URL - Pooled database URL (fallback)
 *   PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT - Lock acquisition timeout (ms)
 *   BUILD_RETRIES - Number of retry attempts (default: 3)
 *   BUILD_RETRY_DELAY - Delay between retries in ms (default: 5000)
 */
/* eslint-disable @typescript-eslint/no-require-imports */ const {
  execSync,
} = require("child_process");
const fs = require("fs");

// Load environment variables from .env.local BEFORE anything else
require("dotenv").config({ path: ".env.local" });

// Configuration
const config = {
  skipMigrations: process.argv.includes("--no-migrate"),
  directUrl: process.argv
    .find((arg) => arg.startsWith("--direct-url="))
    ?.split("=")[1],
  maxRetries: parseInt(process.env.BUILD_RETRIES || "3"),
  retryDelay: parseInt(process.env.BUILD_RETRY_DELAY || "5000"),
  lockTimeout: parseInt(
    process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT || "180000"
  ), // 3 minutes
  verbose: process.env.BUILD_VERBOSE === "true",
};

const log = {
  info: (msg) => console.log(`[BUILD] ℹ️  ${msg}`),
  success: (msg) => console.log(`[BUILD] ✅ ${msg}`),
  warn: (msg) => console.warn(`[BUILD] ⚠️  ${msg}`),
  error: (msg) => console.error(`[BUILD] ❌ ${msg}`),
  debug: (msg) => config.verbose && console.log(`[BUILD] 🔍 ${msg}`),
};

/**
 * Execute a command with retry logic
 */
function executeWithRetry(command, description, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log.info(`${description} (attempt ${attempt}/${maxAttempts})`);
      log.debug(`Command: ${command}`);

      // Determine effective DB URL and mask it for logs
      const effectiveDbUrl =
        config.directUrl ||
        process.env.DIRECT_URL ||
        process.env.DATABASE_URL ||
        "";
      const maskedUrl = effectiveDbUrl.replace(
        /:\/\/([^:@]+):([^@]+)@/,
        "://$1:***@"
      );
      log.info(`Using DB url: ${maskedUrl ? "[configured]" : "[missing]"}`);
      log.info(`Advisory lock timeout: ${config.lockTimeout}ms`);

      execSync(command, {
        stdio: "inherit",
        env: {
          ...process.env,
          // Use direct URL if provided or available in environment
          DATABASE_URL: effectiveDbUrl,
          PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT: config.lockTimeout.toString(),
        },
      });

      log.success(`${description} completed`);
      return true;
    } catch (error) {
      lastError = error;
      log.warn(`${description} failed (attempt ${attempt}/${maxAttempts})`);

      if (attempt < maxAttempts) {
        const delay = config.retryDelay * attempt; // Exponential backoff
        log.info(`Waiting ${delay}ms before retry...`);
        execSync(`node -e "setTimeout(() => {}, ${delay})"`, { stdio: "pipe" });
      }
    }
  }

  throw lastError;
}

/**
 * Validate environment and database connection
 */
function validateEnvironment() {
  log.info("Validating environment...");

  const requiredEnvVars = ["DATABASE_URL"];
  const missing = requiredEnvVars.filter(
    (v) => !process.env[v] && !config.directUrl
  );

  if (missing.length > 0) {
    log.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Check if .env files exist
  const envFiles = [".env.local", ".env.production"];
  const existingEnvs = envFiles.filter((f) => fs.existsSync(f));
  log.debug(`Environment files found: ${existingEnvs.join(", ") || "none"}`);

  log.success("Environment validation passed");
}

/**
 * Ensure Prisma Client is generated
 */
function generatePrismaClient() {
  try {
    log.info("Generating Prisma Client...");
    execSync("npx prisma generate", { stdio: "inherit" });
    log.success("Prisma Client generated");
  } catch (error) {
    log.error("Failed to generate Prisma Client");
    throw error;
  }
}

/**
 * Run database migrations (with retries)
 */
function runMigrations() {
  if (config.skipMigrations) {
    log.warn("Skipping database migrations (--no-migrate flag)");
    return;
  }

  try {
    executeWithRetry(
      "npx prisma migrate deploy",
      "Running database migrations",
      config.maxRetries
    );
  } catch (error) {
    log.error("Database migrations failed after all retries");
    log.info("Try running: npm run db:safe-migrate");
    throw error;
  }
}

/**
 * Seed database if empty and SEED_ON_BUILD is enabled
 * Uses minimal seed mode to keep initial data small
 */
async function seedIfEmpty() {
  const shouldSeed =
    process.env.SEED_ON_BUILD === "true" ||
    (process.env.VERCEL === "1" && process.env.SEED_ON_BUILD !== "false");

  if (!shouldSeed) {
    log.debug("SEED_ON_BUILD not enabled, skipping seed check");
    return;
  }

  log.info("Checking if database needs seeding...");

  try {
    // Quick check: count products to see if DB is seeded
    const result = execSync(
      'npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \\"Product\\";"',
      {
        encoding: "utf-8",
        env: {
          ...process.env,
          DATABASE_URL:
            config.directUrl ||
            process.env.DIRECT_URL ||
            process.env.DATABASE_URL,
        },
        shell: true,
      }
    );

    // Parse the count from output
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
        DATABASE_URL:
          config.directUrl ||
          process.env.DIRECT_URL ||
          process.env.DATABASE_URL,
        SEED_PRODUCT_MODE: "minimal",
        SEED_INCLUDE_USERS: "false",
        SEED_INCLUDE_SYNTHETIC: "false",
      },
    });
    log.success("Minimal seed completed");
  } catch (error) {
    // Non-fatal - log warning but continue build
    log.warn(`Seed check/run failed: ${error.message}`);
    log.warn("You may need to run 'npm run seed' manually after deployment");
  }
}

/**
 * Build Next.js application
 */
function buildNextjs() {
  try {
    executeWithRetry("next build", "Building Next.js application", 2);
  } catch (error) {
    log.error("Next.js build failed");
    throw error;
  }
}

/**
 * Main build process
 */
async function main() {
  const startTime = Date.now();

  try {
    log.info("Starting resilient build process...");
    log.debug(`Config: ${JSON.stringify(config, null, 2)}`);

    // 1. Validate environment
    validateEnvironment();

    // 2. Generate Prisma Client (always needed)
    generatePrismaClient();

    // 3. Run migrations (optional, with retries)
    runMigrations();

    // 4. Seed if empty (optional, only when SEED_ON_BUILD=true)
    await seedIfEmpty();

    // 5. Build Next.js app
    buildNextjs();

    // Success
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log.success(`Build completed successfully in ${duration}s`);
    process.exit(0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log.error(`Build failed after ${duration}s`);
    log.debug(`Error: ${error.message}`);

    // Provide helpful guidance
    if (error.message.includes("advisory lock")) {
      log.info("\n📋 Advisory lock timeout - database is busy or locked:");
      log.info(
        "  1. Try again in a few minutes (wait for other builds to complete)"
      );
      log.info("  2. Use --no-migrate flag: npm run build -- --no-migrate");
      log.info("  3. Run migrations separately: npm run db:safe-migrate");
      log.info("  4. Check Neon dashboard: https://console.neon.tech");
    } else if (error.message.includes("connection")) {
      log.info("\n📋 Database connection failed:");
      log.info("  1. Ensure DATABASE_URL/DIRECT_URL are set correctly");
      log.info("  2. Check Neon database status at: https://console.neon.tech");
      log.info("  3. Try using direct connection (not pooler) for builds");
    }

    process.exit(1);
  }
}

main();
