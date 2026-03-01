#!/usr/bin/env node
// .claude/hooks/post-precheck-stamp-node.js
//
// Claude Code PostToolUse hook — writes timestamp stamps when `npm run precheck`
// or `npm run test:ci` complete successfully. The stamps are read by
// pre-pr-precheck-node.js to allow `gh pr create` only after both pass.
//
// Exit 0 always (PostToolUse hooks are advisory, not blocking).

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const PRECHECK_STAMP = path.join(__dirname, ".precheck-stamp.json");
const TEST_STAMP = path.join(__dirname, ".test-stamp.json");

function writeStamp(file, command) {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify({ passed: true, ts: Date.now(), command }),
      "utf8"
    );
  } catch {
    // Non-fatal
  }
}

function clearStamp(file) {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {
    // Ignore
  }
}

function main(input) {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const command = (parsed.tool_input && parsed.tool_input.command) || "";
  const isError = parsed.tool_response && parsed.tool_response.is_error;

  const isPrecheck = /npm\s+run\s+precheck/i.test(command);
  const isTestCi = /npm\s+run\s+test:ci/i.test(command);

  if (!isPrecheck && !isTestCi) {
    process.exit(0);
  }

  if (isPrecheck) {
    if (isError) {
      clearStamp(PRECHECK_STAMP);
    } else {
      writeStamp(PRECHECK_STAMP, command);
    }
  }

  if (isTestCi) {
    if (isError) {
      clearStamp(TEST_STAMP);
    } else {
      writeStamp(TEST_STAMP, command);
    }
  }

  process.exit(0);
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));
