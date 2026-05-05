/**
 * Database Restore Script
 * Restores all data from a backup file after migration
 *
 * Usage:
 *   npx tsx scripts/restore-database.ts                    # Restores from latest backup
 *   npx tsx scripts/restore-database.ts db-backup-2025...json  # Restores from specific backup
 */

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import readline from "readline";
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
    throw new Error("DATABASE_URL is required to run restore");
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

async function restoreDatabase(backupFile?: string) {
  console.log("🔄 Starting database restore...\n");

  const args = process.argv.slice(2);
  const modeArg = args.find((arg) => arg.startsWith("--mode="));
  let mode: "merge" | "overwrite" = "merge";

  if (modeArg) {
    const value = modeArg.split("=")[1]?.toLowerCase();
    if (value === "overwrite") {
      mode = "overwrite";
    }
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer: string = await new Promise((resolve) => {
      rl.question("Restore mode? (merge/overwrite) [merge]: ", resolve);
    });
    rl.close();
    const normalized = answer.trim().toLowerCase();
    if (normalized === "overwrite") {
      mode = "overwrite";
    }
  }

  try {
    // Determine backup file path
    const backupDir = path.join(process.cwd(), "scripts", "backups");
    let backupPath: string;

    if (backupFile) {
      // Use specified backup file
      backupPath = path.join(backupDir, backupFile);
    } else {
      // Use latest backup
      backupPath = path.join(backupDir, "db-backup-latest.json");
    }

    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup file not found: ${backupPath}`);
      process.exit(1);
    }

    console.log(`📁 Reading backup from: ${backupPath}\n`);

    // Read backup data
    const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    const backupTimestamp = backupData.timestamp?.[0] || "Unknown";
    console.log(`📅 Backup created: ${backupTimestamp}\n`);

    console.log(
      `Mode: ${mode === "overwrite" ? "overwrite (truncate then insert)" : "merge (insert missing only)"}\n`
    );

    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("✅ Connected to database\n");

    // Restoration order - respects foreign key constraints.
    // MUST mirror the table list in scripts/backup-database.ts so a backup
    // taken there can be fully restored here.
    const restoreOrder = [
      "user",
      "account",
      "session",
      "verificationToken",
      "passwordResetToken",
      "siteSettings",
      "telemetryEvent",
      "address",
      "categoryLabel", // Must come before category
      "category",
      "categoryLabelCategory", // Join table after both categoryLabel and category
      "tag",
      "product",
      "productVariant",
      "variantImage", // Images live on variants, not products directly
      "purchaseOption",
      "addOnLink",
      "categoriesOnProducts",
      "productTag",
      "order",
      "orderItem",
      "subscription",
      "aiTokenUsage",
      "newsletterSubscriber",
      "socialLink",
      "page",
      "block",
      "userActivity",
      "productMenuDraft",
      "review",
      "reviewVote",
      "reviewEmailLog",
    ];

    console.log("Restoring data...");
    const deleteOrder = [...restoreOrder].reverse();
    if (mode === "overwrite") {
      for (const table of deleteOrder) {
        if (
          !backupData[table] ||
          !Array.isArray(backupData[table]) ||
          backupData[table].length === 0
        ) {
          continue;
        }
        try {
          // @ts-expect-error - Dynamic table access
          const result = await prisma[table].deleteMany({});
          console.log(`  Cleared ${table} (${result.count} removed)`);
        } catch (error) {
          console.error(`  ⚠️  Failed to clear ${table}:`, error);
        }
      }
    }
    const summary: Record<string, number> = {};

    for (const table of restoreOrder) {
      if (!backupData[table] || !Array.isArray(backupData[table])) {
        console.log(`  ⏭️  Skipping ${table} (no data in backup)`);
        continue;
      }

      const records = backupData[table];
      if (records.length === 0) {
        console.log(`  ⏭️  Skipping ${table} (empty)`);
        continue;
      }

      try {
        console.log(`  Restoring ${table}...`);

        // Use createMany for batch insertion
        // @ts-expect-error - Dynamic table access
        const result = await prisma[table].createMany({
          data: records,
          skipDuplicates: true, // avoid unique conflicts in merge mode; overwrite has been truncated
        });

        summary[table] = result.count;
        console.log(`    ✓ ${result.count} records restored`);
      } catch (error) {
        console.error(`    ❌ Error restoring ${table}:`, error);
        summary[table] = 0;
      }
    }

    console.log("\n✅ Database restore completed!");

    // Print summary
    console.log("\n📊 Restore Summary:");
    for (const [tableName, count] of Object.entries(summary)) {
      console.log(`   ${tableName}: ${count} records`);
    }
    console.log("");

    return true;
  } catch (error) {
    console.error("❌ Error restoring database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get backup file from command line argument
const backupFile = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

// Run the restore
restoreDatabase(backupFile)
  .then(() => {
    console.log("✅ Restore process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Restore process failed:", error);
    process.exit(1);
  });
