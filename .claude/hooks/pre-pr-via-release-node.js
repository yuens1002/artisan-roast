#!/usr/bin/env node
// .claude/hooks/pre-pr-via-release-node.js
//
// Claude Code PreToolUse hook — intercepts `gh pr create` and ensures the
// caller is going through the `/release` flow rather than opening a PR
// directly from `/commit`, `/review`, or an ad-hoc bash command.
//
// The signal: the latest commit on the current branch must match a canonical
// `/release` fingerprint:
//   - `bump version to X.Y.Z`  — produced by the normal release Phase A
//   - `docs-only release`      — produced by `/release --docs-only`
// If the latest commit does NOT match either shape, the caller hasn't run
// `/release` and we block.
//
// Why a structural gate beats a memory/skill rule:
//   - Skills can read their own instructions in isolation and miss
//     standing rules that say "use a different skill instead."
//   - Memory entries describing "always use /release" get bypassed
//     mid-flow once a skill is in motion.
//   - A hook that checks a real git artifact can't be talked around.
//
// Exit 0 = allow, Exit 2 = block (stderr shown to model)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require("child_process");

// Matches the canonical `/release` HEAD commit fingerprints. Normal releases
// create a `bump version to X.Y.Z` commit; `/release --docs-only` creates a
// `docs-only release` empty marker commit. Tolerates a trailing suffix (e.g.
// `(#123)` from squash-merge replays) so we don't over-block after a release
// that re-runs against main.
const RELEASE_FINGERPRINT_RE =
  /^(?:bump version to \d+\.\d+\.\d+\b|docs-only release\b)/i;

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

  // Only intercept `gh pr create` when it appears at a shell-command position —
  // start-of-string, or after a shell operator (`;`, `&&`, `||`, `|`, newline,
  // open paren) — and tolerate optional shell whitespace after that boundary.
  // This prevents false matches when the literal text "gh pr create" appears
  // inside a heredoc / quoted string (e.g. inside a commit message body
  // referencing the command by name), while still catching leading-whitespace
  // variants such as `  gh pr create`.
  if (!/(?:^|[\n;&|(])\s*gh\s+pr\s+create\b/i.test(command)) {
    process.exit(0);
  }

  const projectDir = path.resolve(__dirname, "..", "..");

  // Read the latest commit subject on the current HEAD. Fail closed if git
  // state can't be verified — letting PR creation proceed in exactly the
  // scenarios where enforcement is most needed (misconfigured repo,
  // unexpected cwd, missing git binary) would defeat the structural
  // guarantee this hook provides.
  let lastSubject = "";
  try {
    lastSubject = exec("git log -1 --format=%s", projectDir);
  } catch {
    deny(
      "BLOCKED: `gh pr create` is gated to the `/release` flow, but this hook\n" +
        "could not verify the latest git commit because `git log` failed.\n\n" +
        `Expected to read git state from:\n  ${projectDir}\n\n` +
        "Fix your git/working-directory state, then try again:\n" +
        "1. Make sure this directory is the intended repository checkout and\n" +
        "   contains valid `.git` metadata.\n" +
        "2. Make sure `git` is installed and available in PATH for this hook.\n" +
        "3. Re-run the `/release <patch|minor|major>` flow from the repository.\n"
    );
  }

  if (RELEASE_FINGERPRINT_RE.test(lastSubject)) {
    // `/release` produced this commit; PR creation is authorized.
    process.exit(0);
  }

  deny(
    "BLOCKED: `gh pr create` is gated to the `/release` flow.\n\n" +
      `The latest commit on this branch is:\n  ${lastSubject}\n\n` +
      "It must match a `/release` fingerprint:\n" +
      "  - `bump version to X.Y.Z`  (normal release)\n" +
      "  - `docs-only release`      (the --docs-only path)\n\n" +
      "Do not open a PR directly from `/commit`, `/review`, or an ad-hoc bash\n" +
      "invocation.\n\n" +
      "── How to proceed ──\n" +
      "1. Run `/release <patch|minor|major>` — it bumps package.json, updates\n" +
      "   CHANGELOG.md, commits the bump, and creates the PR.\n" +
      "2. Or `/release --docs-only` for documentation-only changes (creates a\n" +
      "   `docs-only release` empty marker commit, no version bump).\n" +
      "3. If you have an exceptional reason to bypass (e.g. recovering from a\n" +
      "   crashed release flow), check with the user before forcing it.\n"
  );
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));
