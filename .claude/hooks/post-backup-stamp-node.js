#!/usr/bin/env node
// .claude/hooks/post-backup-stamp-node.js
//
// Claude Code PostToolUse hook — writes a timestamp stamp when `npm run db:backup`
// completes successfully. The stamp is read by pre-migrate-backup-node.js to allow
// `prisma migrate dev` without re-running the backup every time (within 4 hours).
//
// Exit 0 always (PostToolUse hooks are advisory, not blocking).

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const STAMP_FILE = path.join(__dirname, ".backup-stamp.json");

function main(input) {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const command = (parsed.tool_input && parsed.tool_input.command) || "";
  const isError = parsed.tool_response && parsed.tool_response.is_error;

  // Only stamp when `npm run db:backup` runs
  if (!/npm\s+run\s+db:backup/i.test(command)) {
    process.exit(0);
  }

  if (isError) {
    // Backup failed — clear stamp so migration gate still blocks
    try {
      if (fs.existsSync(STAMP_FILE)) fs.unlinkSync(STAMP_FILE);
    } catch {
      // Ignore
    }
    process.exit(0);
  }

  // Write stamp
  try {
    fs.writeFileSync(
      STAMP_FILE,
      JSON.stringify({ passed: true, ts: Date.now(), command }),
      "utf8"
    );
  } catch {
    // Non-fatal
  }

  process.exit(0);
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));
