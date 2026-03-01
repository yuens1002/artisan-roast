#!/usr/bin/env node
// .claude/hooks/pre-migrate-backup-node.js
//
// Claude Code PreToolUse hook — blocks `prisma migrate dev` until a backup
// stamp exists. The stamp is written by post-backup-stamp-node.js (PostToolUse)
// whenever `npm run db:backup` completes successfully.
//
// This enforces the database safety protocol: always backup before migrating.
//
// Exit 0 = allow. Exit 2 = block (message injected to Claude via stderr).

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const STAMP_FILE = path.join(__dirname, ".backup-stamp.json");
const STAMP_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function allow() {
  process.exit(0);
}

function block(reason) {
  process.stderr.write(reason);
  process.exit(2);
}

function main(input) {
  let command = "";
  try {
    const parsed = JSON.parse(input);
    command = (parsed.tool_input && parsed.tool_input.command) || "";
  } catch {
    allow();
  }

  // Only gate actual `prisma migrate dev` commands, not text mentioning it
  // Anchored to start-of-string or after && / ; to avoid heredoc false positives
  if (!/(?:^|&&\s*|;\s*)(?:npx\s+)?prisma\s+migrate\s+dev/i.test(command)) {
    allow();
  }

  // Check for a fresh backup stamp
  if (fs.existsSync(STAMP_FILE)) {
    try {
      const stamp = JSON.parse(fs.readFileSync(STAMP_FILE, "utf8"));
      const age = Date.now() - (stamp.ts || 0);
      if (stamp.passed === true && age < STAMP_TTL_MS) {
        allow();
      }
    } catch {
      // Corrupt stamp — fall through to block
    }
  }

  block(
    `SAFETY: Database backup required before running migrations.\n\n` +
      `Run the following first, then re-run the migrate command:\n\n` +
      `  npm run db:backup\n\n` +
      `Once the backup completes, re-run: ${command.trim()}`
  );
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));
