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
// Gate 3 — Resolve every standing review thread:
//   Blocks if any review thread on the PR remains unresolved (isResolved == false).
//   This is independent of Gate 2's "newer commit" heuristic — replying to a
//   comment OR pushing a fix doesn't mark a thread resolved in the GitHub UI.
//   Resolution requires explicit GraphQL `resolveReviewThread` calls.
//   Bypass: ack file (.claude/.copilot-ack-{pr}.json) skips this gate too.
//
// Error policy: Gates 1 and 2 are fail-closed on API/CLI verification errors.
// Gate 3 has a narrower fail-open exception: if its GraphQL fetch fails at the
// transport / parsing layer, the hook allows the merge rather than blocking on
// an indeterminate thread-resolution check (Gate 2 has already passed by that
// point — feedback is presumed addressed). Keep this comment in sync with the
// enforcement logic below if either gate's failure mode changes.
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

  // Only intercept `gh pr merge` when it appears at a shell-command position —
  // start-of-string, or after a shell operator (`;`, `&&`, `||`, `|`, newline,
  // open paren) — and tolerate optional shell whitespace after that boundary.
  // This prevents false matches when the literal text "gh pr merge" appears
  // inside a heredoc / quoted string (e.g. inside a commit message body
  // referencing the command by name), while still catching leading-whitespace
  // variants such as `  gh pr merge`.
  if (!/(?:^|[\n;&|(])\s*gh\s+pr\s+merge\b/i.test(command)) {
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

  // Gate 2 only applies when Copilot left inline comments. With zero comments
  // there's nothing to "address" via newer commits, so we skip Gate 2 entirely
  // and fall through to Gate 3 — which still needs to run because human
  // reviewers (or earlier Copilot review-thread comments) may have unresolved
  // threads independent of inline-comment state.
  if (comments.length > 0) {
    // Check if commits were pushed after the Copilot review (feedback addressed)
    let gate2Passed = false;
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
        gate2Passed = true; // Newer commits exist — feedback presumed addressed
      }
    } catch {
      // Timestamp comparison failed — leave gate2Passed false (fail-closed)
    }

    if (!gate2Passed) {
      denyForUnaddressedComments(prNumber, comments);
    }
  }

  // ── Gate 3: All review threads resolved ──────────────────────────────
  //
  // Runs independently of Gate 2 — a PR can have zero Copilot inline comments
  // but still have unresolved threads from human reviewers or earlier Copilot
  // review summaries. GitHub's review-thread state is independent of comment
  // replies and commit timestamps. Gate 2's "newer commit" heuristic lets
  // feedback through but doesn't close threads in the UI — so Gate 3 enforces
  // explicit resolution via the GraphQL `resolveReviewThread` mutation.
  // Paginate through all review threads (GraphQL caps at 100 per page).
  // Without pagination, PRs with >100 threads would skip checks for any
  // thread past the first page — an unresolved thread on page 2 would
  // silently allow merge.
  const unresolvedThreads = [];
  try {
    const owner = repo.split("/")[0];
    const name = repo.split("/")[1];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
      const afterClause = endCursor ? `, after: \"${endCursor}\"` : "";
      const graphqlQuery = `query { repository(owner: \"${owner}\", name: \"${name}\") { pullRequest(number: ${prNumber}) { reviewThreads(first: 100${afterClause}) { nodes { id isResolved comments(first: 1) { nodes { author { login } path body } } } pageInfo { hasNextPage endCursor } } } } }`;
      const rawThreads = exec(
        `gh api graphql -f query='${graphqlQuery.replace(/'/g, "'\\''")}'`,
        projectDir
      );
      const parsed = rawThreads ? JSON.parse(rawThreads) : null;

      // GraphQL can return HTTP 200 with an `errors` payload and no `data`.
      // Treating that as "no threads" would silently allow merges even
      // though the thread-resolution check was indeterminate. Throw so the
      // outer catch falls through to fail-open (Gate 2 has already passed
      // by the time we reach this code).
      if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
        throw new Error(
          `GraphQL reviewThreads query returned errors: ${parsed.errors
            .map((e) => e?.message || "Unknown GraphQL error")
            .join("; ")}`
        );
      }
      const reviewThreads = parsed?.data?.repository?.pullRequest?.reviewThreads;
      if (!reviewThreads) {
        throw new Error(
          "GraphQL reviewThreads query did not return the expected data shape."
        );
      }
      const nodes = reviewThreads.nodes ?? [];

      unresolvedThreads.push(
        ...nodes
          .filter((t) => !t.isResolved)
          .map((t) => ({
            id: t.id,
            path: t.comments?.nodes?.[0]?.path || "",
            body: t.comments?.nodes?.[0]?.body || "",
            author: t.comments?.nodes?.[0]?.author?.login || "",
          }))
      );

      hasNextPage = reviewThreads.pageInfo?.hasNextPage ?? false;
      endCursor = reviewThreads.pageInfo?.endCursor ?? null;
    }
  } catch (err) {
    // GraphQL failure — fall back to Gate 2 result and allow merge.
    // We've already passed Gate 2 (newer commit exists, or no comments to
    // address) so don't fail-closed on a transient API issue. Emit a
    // stderr warning so the caller has audit of the indeterminate state
    // even though merge proceeds.
    const reason = err && err.message ? err.message : String(err);
    process.stderr.write(
      `WARN: Gate 3 (review thread resolution) check skipped — ${reason}\n` +
        "Merge proceeding because Gate 2 has already passed; thread state is\n" +
        "unverified for this run. Re-run after the API is reachable to confirm.\n"
    );
    process.exit(0);
  }

  if (unresolvedThreads.length === 0) {
    process.exit(0); // All threads resolved — allow merge
  }

  // Block: unresolved review threads remain
  let msg = `BLOCKED: PR #${prNumber} has ${unresolvedThreads.length} unresolved review thread(s).\n\n`;

  unresolvedThreads.forEach((t, i) => {
    const body = t.body.length > 200 ? t.body.slice(0, 197) + "..." : t.body;
    msg += `${i + 1}. [${t.author} on ${t.path}]\n`;
    msg += `   ${body.replace(/\n/g, "\n   ")}\n`;
    msg += `   Thread id: ${t.id}\n\n`;
  });

  msg += "── How to proceed ──\n";
  msg += "Resolve each thread via the GraphQL `resolveReviewThread` mutation:\n\n";
  msg +=
    "  gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: \"<THREAD_ID>\"}) { thread { isResolved } } }'\n\n";
  msg += "A reply alone (or a newer commit) does NOT mark a thread resolved.\n";
  msg += "After resolving all threads, retry the merge.\n";

  deny(msg);
}

// (Gate 2's original "all comments unaddressed" branch lives below; kept
// here as a fall-through for the case where there's no newer commit.)
function denyForUnaddressedComments(prNumber, comments) {
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
  msg += `   Write { \"reviewed\": true } to .claude/.copilot-ack-${prNumber}.json\n`;
  msg += "4. Retry the merge\n";

  deny(msg);
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));
