#!/usr/bin/env node
// .claude/hooks/pre-pr-precheck-node.js
//
// Claude Code PreToolUse hook — blocks `gh pr create` until fresh stamps exist
// for both `npm run precheck` AND `npm run test:ci`. Stamps are written by
// post-precheck-stamp-node.js (PostToolUse) after each command succeeds.
//
// Exit 0 = allow. Exit 2 = block (message injected to Claude via stderr).

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const PRECHECK_STAMP = path.join(__dirname, ".precheck-stamp.json");
const TEST_STAMP = path.join(__dirname, ".test-stamp.json");
const STAMP_TTL_MS = 60 * 60 * 1000; // 1 hour

function allow() {
  process.exit(0);
}

function block(reason) {
  process.stderr.write(reason);
  process.exit(2);
}

function isFreshStamp(stampFile) {
  if (!fs.existsSync(stampFile)) return false;
  try {
    const stamp = JSON.parse(fs.readFileSync(stampFile, "utf8"));
    const age = Date.now() - (stamp.ts || 0);
    return stamp.passed === true && age < STAMP_TTL_MS;
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require("child_process");

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

  // Cross-repo skip: precheck stamps are ecomm-specific. If `--repo owner/name`
  // targets a different repo, the gate does not apply — each repo enforces its
  // own quality gates via its own hooks. Fail open if we can't verify.
  const repoFlagMatch = command.match(/--repo\s+([\w.-]+\/[\w.-]+)/);
  if (repoFlagMatch) {
    const targetRepo = repoFlagMatch[1].toLowerCase();
    try {
      const projectDir = path.resolve(__dirname, "..", "..");
      const currentRepo = execSync(
        "gh repo view --json nameWithOwner -q .nameWithOwner",
        { cwd: projectDir, encoding: "utf8" }
      ).trim().toLowerCase();
      if (targetRepo !== currentRepo) {
        allow(); // cross-repo PR — gate does not apply
      }
    } catch {
      allow(); // can't verify current repo — allow
    }
  }

  const precheckOk = isFreshStamp(PRECHECK_STAMP);
  const testOk = isFreshStamp(TEST_STAMP);

  if (precheckOk && testOk) {
    allow();
  }

  // Build specific message about what's missing
  const missing = [];
  if (!precheckOk) missing.push("npm run precheck");
  if (!testOk) missing.push("npm run test:ci");

  block(
    `GATE: PR creation requires both precheck and tests to pass.\n\n` +
      `Missing: ${missing.join(" and ")}\n\n` +
      `Run the following and fix any errors, then re-run the PR command:\n\n` +
      `  ${missing.join(" && ")}\n\n` +
      `Once they pass, re-run: ${command.trim()}`
  );
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));
