#!/usr/bin/env node
// .claude/hooks/review-before-merge-node.js
//
// Claude Code PreToolUse hook — intercepts `gh pr merge` and ensures Copilot
// has reviewed code PRs before allowing merge, then checks for unaddressed
// review comments.
//
// Gate 1 — Wait for Copilot review (code PRs only):
//   Blocks if the PR changes code files and Copilot hasn't reviewed yet.
//   Docs-only PRs (.md, .txt, docs/**, etc.) skip this gate.
//
// Gate 2 — Address Copilot feedback:
//   Blocks if Copilot left inline comments that haven't been addressed.
//   Bypass conditions (merge allowed when ANY is true):
//     a. No Copilot inline comments on the PR
//     b. New commits pushed AFTER the Copilot review (feedback addressed)
//     c. Ack file exists: .claude/.copilot-ack-{pr}.json (reviewed, no changes needed)
//
// Error policy: API failures BLOCK the merge (fail-closed). If the hook can't
// verify Copilot's review status, it's safer to block than to silently allow.
//
// Exit 0 = allow, Exit 2 = block (stderr shown to model)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require("child_process");

const COPILOT_LOGIN = "Copilot";

// Files matching these patterns are non-code (no Copilot review needed)
const DOCS_ONLY_PATTERNS = [
  /\.md$/i,
  /\.txt$/i,
  /^docs\//,
  /^\.archive\//,
  /^LICENSE$/,
  /^\.gitignore$/,
  /^CHANGELOG\.md$/i,
];

function isDocsFile(filepath) {
  return DOCS_ONLY_PATTERNS.some((p) => p.test(filepath));
}

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
      process.exit(0); // No PR for this branch — not a merge scenario
    }
  }

  if (!prNumber) {
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
    deny(
      `BLOCKED: Could not determine repository for PR #${prNumber}.\n` +
        "Check your network connection and gh auth status, then retry.\n"
    );
  }

  // ── Gate 1: Wait for Copilot review on code PRs ──────────────────────

  // Check if Copilot has submitted any review
  let copilotHasReviewed = false;
  try {
    const rawReviews = exec(
      `gh api --paginate repos/${repo}/pulls/${prNumber}/reviews`,
      projectDir
    );
    const reviews = rawReviews ? JSON.parse(rawReviews) : [];
    copilotHasReviewed = reviews.some((r) => /copilot/i.test(r.user?.login || ""));
  } catch {
    // API failure — block (fail-closed)
    deny(
      `BLOCKED: Could not check Copilot review status for PR #${prNumber}.\n` +
        "The API call to fetch reviews failed. Check your network and retry.\n"
    );
  }

  if (!copilotHasReviewed) {
    // Check if the PR has code file changes (not just docs)
    let hasCodeChanges = false;
    try {
      const rawFiles = exec(
        `gh api --paginate repos/${repo}/pulls/${prNumber}/files`,
        projectDir
      );
      const prFiles = rawFiles ? JSON.parse(rawFiles) : [];
      hasCodeChanges = prFiles.some((f) => !isDocsFile(f.filename || ""));
    } catch {
      // Can't determine files — assume code changes exist (fail-closed)
      hasCodeChanges = true;
    }

    if (hasCodeChanges) {
      deny(
        `BLOCKED: Copilot has not reviewed PR #${prNumber} yet.\n\n` +
          "This PR contains code changes — wait for the Copilot review before merging.\n" +
          "Re-attempt the merge after Copilot's review appears on the PR.\n"
      );
    }
    // Docs-only PR with no Copilot review — allow
    process.exit(0);
  }

  // ── Gate 2: Address Copilot feedback ─────────────────────────────────

  // Ack file bypasses Gate 2 only (Gate 1 already passed above)
  const ackFile = path.join(claudeDir, `.copilot-ack-${prNumber}.json`);
  if (fs.existsSync(ackFile)) {
    try {
      fs.unlinkSync(ackFile);
    } catch {
      /* ignore cleanup errors */
    }
    process.exit(0);
  }

  // Fetch Copilot inline comments
  let comments = [];
  try {
    const rawComments = exec(
      `gh api --paginate repos/${repo}/pulls/${prNumber}/comments`,
      projectDir
    );
    const allComments = rawComments ? JSON.parse(rawComments) : [];
    comments = allComments
      .filter((c) => c.user?.login === COPILOT_LOGIN)
      .map((c) => ({
        id: c.id,
        path: c.path,
        line: c.line || c.original_line,
        body: c.body,
      }));
  } catch {
    // API failure — block (fail-closed)
    deny(
      `BLOCKED: Could not fetch Copilot review comments for PR #${prNumber}.\n` +
        "The API call failed. Check your network and retry.\n"
    );
  }

  if (comments.length === 0) {
    process.exit(0); // Copilot reviewed but left no inline comments — allow
  }

  // Check if commits were pushed after the Copilot review (feedback addressed)
  try {
    const rawReviewsForTime = exec(
      `gh api --paginate repos/${repo}/pulls/${prNumber}/reviews`,
      projectDir
    );
    const reviewsForTime = rawReviewsForTime ? JSON.parse(rawReviewsForTime) : [];
    const copilotTimes = reviewsForTime
      .filter((r) => /copilot/i.test(r.user?.login || ""))
      .map((r) => r.submitted_at)
      .sort();
    const reviewTime = copilotTimes[copilotTimes.length - 1];

    const rawCommits = exec(
      `gh api --paginate repos/${repo}/pulls/${prNumber}/commits`,
      projectDir
    );
    const commits = rawCommits ? JSON.parse(rawCommits) : [];
    const lastCommitTime = commits.length > 0
      ? commits[commits.length - 1].commit?.committer?.date
      : null;

    if (
      reviewTime &&
      lastCommitTime &&
      new Date(lastCommitTime) > new Date(reviewTime)
    ) {
      // Newer commits exist — feedback was addressed
      process.exit(0);
    }
  } catch {
    // Timestamp comparison failed — fall through to block (fail-closed)
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
