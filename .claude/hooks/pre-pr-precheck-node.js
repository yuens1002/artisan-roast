#!/usr/bin/env node
// .claude/hooks/pre-pr-precheck-node.js
//
// Claude Code PreToolUse hook — blocks `gh pr create` until a fresh precheck
// stamp exists. The stamp is written by post-precheck-stamp-node.js (PostToolUse)
// whenever `npm run precheck` completes successfully.
//
// Exit 0 = allow. Exit 2 = block (message injected to Claude via stderr).

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const STAMP_FILE = path.join(__dirname, ".precheck-stamp.json");
const STAMP_TTL_MS = 60 * 60 * 1000; // 1 hour

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

  // Only gate actual `gh pr create` commands, not text mentioning it
  // Anchored to start-of-string or after && / ; to avoid heredoc false positives
  if (!/(?:^|&&\s*|;\s*)gh\s+pr\s+create/i.test(command)) {
    allow();
  }

  // Check for a fresh precheck stamp
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
    `GATE: precheck has not passed yet this session.\n\n` +
      `Run both of the following and fix any errors, then re-run the PR command:\n\n` +
      `  npm run precheck && npm run test:ci\n\n` +
      `Once they pass, re-run: ${command.trim()}`
  );
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));
