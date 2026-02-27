#!/usr/bin/env node
// .claude/hooks/review-before-merge-node.js
//
// Claude Code PreToolUse hook — intercepts `gh pr merge` and checks for
// unaddressed Copilot review comments. Blocks the merge until feedback
// has been reviewed and acted on.
//
// Bypass conditions (merge is allowed when ANY is true):
//   1. No Copilot inline comments on the PR
//   2. New commits pushed AFTER the Copilot review (feedback addressed)
//   3. Ack file exists: .claude/.copilot-ack-{pr}.json (reviewed, no changes needed)
//
// Exit 0 = allow, Exit 2 = block (stderr shown to model)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require("child_process");

const COPILOT_LOGIN = "Copilot";

function deny(reason) {
  process.stderr.write(reason);
  process.exit(2);
}

function exec(cmd, cwd) {
  return execSync(cmd, {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function main(input) {
  let command = "";
  try {
    const parsed = JSON.parse(input);
    command = (parsed.tool_input && parsed.tool_input.command) || "";
  } catch {
    process.exit(0);
  }

  // Only intercept gh pr merge commands
  if (!/gh\s+pr\s+merge/i.test(command)) {
    process.exit(0);
  }

  const projectDir = path.resolve(__dirname, "..", "..");
  const claudeDir = path.resolve(__dirname, "..");

  // Extract PR number from command args, URL, or current branch
  let prNumber = "";
  const numMatch = command.match(/gh\s+pr\s+merge\s+(\d+)/);
  const urlMatch = command.match(/\/pull\/(\d+)/);

  if (numMatch) {
    prNumber = numMatch[1];
  } else if (urlMatch) {
    prNumber = urlMatch[1];
  } else {
    try {
      prNumber = exec("gh pr view --json number -q .number", projectDir);
    } catch {
      process.exit(0); // No PR for this branch
    }
  }

  if (!prNumber) {
    process.exit(0);
  }

  // Bypass: ack file means Claude already reviewed this PR's comments
  const ackFile = path.join(claudeDir, `.copilot-ack-${prNumber}.json`);
  if (fs.existsSync(ackFile)) {
    try {
      fs.unlinkSync(ackFile);
    } catch {
      /* ignore cleanup errors */
    }
    process.exit(0);
  }

  // Get repo name for API calls
  let repo = "";
  try {
    repo = exec(
      "gh repo view --json nameWithOwner -q .nameWithOwner",
      projectDir
    );
  } catch {
    process.exit(0); // Can't determine repo — allow
  }

  // Fetch Copilot inline comments
  let comments = [];
  try {
    const raw = exec(
      `gh api repos/${repo}/pulls/${prNumber}/comments ` +
        `--jq '.[] | select(.user.login == "${COPILOT_LOGIN}") | {id: .id, path: .path, line: (.line // .original_line), body: .body}'`,
      projectDir
    );
    if (raw) {
      comments = raw
        .split("\n")
        .filter((l) => l.startsWith("{"))
        .map((l) => JSON.parse(l));
    }
  } catch {
    process.exit(0); // API failure — don't block on network issues
  }

  if (comments.length === 0) {
    process.exit(0); // No Copilot comments — nothing to review
  }

  // Check if commits were pushed after the Copilot review (feedback addressed)
  try {
    const reviewTime = exec(
      `gh api repos/${repo}/pulls/${prNumber}/reviews ` +
        `--jq '[.[] | select(.user.login | test("copilot";"i")) | .submitted_at] | sort | last'`,
      projectDir
    );
    const lastCommitTime = exec(
      `gh api repos/${repo}/pulls/${prNumber}/commits --jq 'last | .commit.committer.date'`,
      projectDir
    );

    if (
      reviewTime &&
      lastCommitTime &&
      new Date(lastCommitTime) > new Date(reviewTime)
    ) {
      // Newer commits exist — feedback was addressed
      process.exit(0);
    }
  } catch {
    // Timestamp comparison failed — fall through to block
  }

  // Block: Copilot left unaddressed comments
  let msg = `BLOCKED: Copilot left ${comments.length} review comment(s) on PR #${prNumber} that have not been addressed.\n\n`;

  comments.forEach((c, i) => {
    const body =
      c.body.length > 300 ? c.body.slice(0, 297) + "..." : c.body;
    msg += `${i + 1}. [${c.path}:${c.line}]\n`;
    msg += `   ${body.replace(/\n/g, "\n   ")}\n\n`;
  });

  msg += "── How to proceed ──\n";
  msg += "1. Evaluate each comment — make code changes where warranted\n";
  msg += "2. Push changes (new commits after the review auto-clear this gate)\n";
  msg += "3. If NO code changes are needed after review, acknowledge:\n";
  msg += `   Write { "reviewed": true } to .claude/.copilot-ack-${prNumber}.json\n`;
  msg += "4. Retry the merge\n";

  deny(msg);
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));
