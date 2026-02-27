#!/usr/bin/env node
// .claude/hooks/verify-before-stop-node.js
//
// Claude Code Stop hook — blocks Claude from finishing a response when
// the current branch has "pending" or "partial" verification status.
//
// This prevents the agent from declaring "done" without running verification.
//
// Exit 0 = allow stop.
// Exit 2 = block stop (reason on stderr), Claude must continue.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require("child_process");

function block(reason) {
  process.stderr.write(reason);
  process.exit(2);
}

const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".css", ".prisma"];

function hasSourceChanges(projectDir) {
  let status = "";
  try {
    status = execSync("git status --porcelain", {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return false;
  }

  if (!status) return false;

  return status.split("\n").some((line) => {
    // git status --porcelain lines: XY filename
    const file = line.slice(3).trim();
    return SOURCE_EXTS.some((ext) => file.endsWith(ext));
  });
}

function main(input) {
  // Parse stdin — Stop hooks receive JSON with stop_hook_active flag
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    // No valid JSON — allow
    process.exit(0);
  }

  // Prevent infinite loop: if stop hook already fired this cycle, allow
  if (parsed.stop_hook_active === true) {
    process.exit(0);
  }

  const hookDir = __dirname;
  const projectDir = path.resolve(hookDir, "..", "..");
  const statusFile = path.join(hookDir, "..", "verification-status.json");

  // Get current branch
  let branch = "";
  try {
    branch = execSync("git branch --show-current", {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    process.exit(0);
  }

  // Skip on main or detached HEAD
  if (!branch || branch === "main" || branch === "master") {
    process.exit(0);
  }

  // No source changes — nothing to enforce
  if (!hasSourceChanges(projectDir)) {
    process.exit(0);
  }

  // No status file — soft reminder
  if (!fs.existsSync(statusFile)) {
    block(
      `REMINDER: Branch '${branch}' has uncommitted source changes but no ` +
        `verification-status.json file. If this is an AC-driven feature, ` +
        `create a verification-status entry and run /verify-workflow before finishing.\n\n` +
        `NOTE: For patch/hotfix branches without ACs, this reminder can be ignored.`
    );
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(statusFile, "utf8"));
  } catch {
    process.exit(0);
  }

  const entry = data.branches && data.branches[branch];

  // No entry for this branch — soft reminder
  if (!entry) {
    block(
      `REMINDER: Branch '${branch}' has uncommitted source changes but no ` +
        `workflow entry in verification-status.json. If this is an AC-driven ` +
        `feature, register the branch and run /verify-workflow before finishing.\n\n` +
        `NOTE: For patch/hotfix branches without ACs, this reminder can be ignored.`
    );
  }

  const status = entry.status || "pending";
  const passed = entry.acs_passed || 0;
  const total = entry.acs_total || 0;

  switch (status) {
    case "verified": {
      // Verified — but check QC quality if ACs doc exists
      const acsDoc = entry.acs_doc || "";
      if (acsDoc) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { validateQC } = require("./qc-validator");
        const qcResult = validateQC(projectDir, acsDoc);
        if (!qcResult.valid) {
          block(
            `BLOCKED: QC validation failed for "${branch}" (${qcResult.issues.length} issue(s)):\n` +
              qcResult.issues.map((i) => `  • ${i}`).join("\n") +
              `\n\nFix the QC column in ${acsDoc} with substantive, independent evidence before finishing.`
          );
        }
      }
      process.exit(0);
      break;
    }
    case "planned":
    case "implementing":
    case "planning":
      // Allow stop during these states
      process.exit(0);
      break;

    case "pending":
      block(
        `BLOCKED: Implementation appears complete on '${branch}' but ` +
          `verification has not been done (${total} ACs pending). ` +
          `Run /verify-workflow or /ac-verify. ` +
          `Do NOT present results to the user without verification.`
      );
      break;

    case "partial":
      block(
        `BLOCKED: Verification incomplete on '${branch}' ` +
          `(${passed}/${total} ACs passed). ` +
          `Complete all AC verification before declaring done.`
      );
      break;

    default:
      block(
        `BLOCKED: Branch '${branch}' has unknown status "${status}". ` +
          `Update verification-status.json to a valid state before finishing.`
      );
      break;
  }
}

// Read stdin
let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));
