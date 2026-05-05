/**
 * Database Backup Script
 * Exports all data from the database before migration
 */

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import ws from "ws";
import { Pool } from "pg";

// Load environment variables
config({ path: ".env.local" });

const shouldUseNeonAdapter = () => {
  const adapterEnv = process.env.DATABASE_ADAPTER?.toLowerCase();
  if (adapterEnv === "neon") return true;
  if (adapterEnv === "postgres" || adapterEnv === "standard") return false;
  return process.env.DATABASE_URL?.includes("neon.tech") ?? false;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run backups");
  }

  if (!shouldUseNeonAdapter()) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
};

const prisma = createPrismaClient();

async function backupDatabase() {
  console.log("🔄 Starting database backup...\n");

  try {
    console.log("Connecting to database...");

    // Test connection first
    await prisma.$connect();
    console.log("✅ Connected to database\n");

    // Fetch all data from all tables
    console.log("Fetching data from all tables...");
    const data: Record<string, unknown[]> = {
      timestamp: [new Date().toISOString()],
    };

    // Fetch each table individually with error handling
    const tables = [
      "user",
      "account",
      "session",
      "verificationToken",
      "passwordResetToken",
      "address",
      "categoryLabel",
      "category",
      "categoryLabelCategory",
      "categoriesOnProducts",
      "product",
      "productVariant",
      "variantImage",
      "purchaseOption",
      "addOnLink",
      "order",
      "orderItem",
      "subscription",
      "newsletterSubscriber",
      "siteSettings",
      "telemetryEvent",
      "socialLink",
      "tag",
      "productTag",
      "page",
      "block",
      "aiTokenUsage",
      "userActivity",
      "productMenuDraft",
      "review",
      "reviewVote",
      "reviewEmailLog",
    ];

    // Validate models exist on the Prisma client before fetching
    for (const table of tables) {
      const model = (prisma as unknown as Record<string, unknown>)[table];
      const hasFindMany =
        typeof (model as { findMany?: unknown })?.findMany === "function";
      if (!hasFindMany) {
        throw new Error(
          `Prisma model missing or does not support findMany: ${table}`
        );
      }
    }

    for (const table of tables) {
      try {
        console.log(`  Fetching ${table}...`);
        // @ts-expect-error - Dynamic table access
        const records = await prisma[table].findMany();
        data[table] = records;
        console.log(`    ✓ ${records.length} records`);
      } catch (error) {
        console.warn(`    ⚠ Warning: Could not fetch ${table}:`, error);
        data[table] = [];
      }
    }

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), "scripts", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Write backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `db-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

    // Also create a "latest" backup for easy restoration
    const latestBackupPath = path.join(backupDir, "db-backup-latest.json");
    fs.writeFileSync(latestBackupPath, JSON.stringify(data, null, 2));

    console.log("✅ Database backup completed successfully!");
    console.log(`📁 Backup saved to: ${backupPath}`);
    console.log(`📁 Latest backup: ${latestBackupPath}\n`);

    // Print summary
    console.log("\n📊 Backup Summary:");
    for (const [tableName, records] of Object.entries(data)) {
      if (tableName !== "timestamp" && Array.isArray(records)) {
        console.log(`   ${tableName}: ${records.length} records`);
      }
    }
    console.log("");

    return backupPath;
  } catch (error) {
    console.error("❌ Error backing up database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backup
backupDatabase()
  .then((_backupPath) => {
    console.log("✅ Backup process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Backup process failed:", error);
    process.exit(1);
  });
