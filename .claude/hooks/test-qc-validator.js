#!/usr/bin/env node
// .claude/hooks/test-qc-validator.js
//
// Test script for qc-validator.js. Run with:
//   node .claude/hooks/test-qc-validator.js
//
// Tests against synthetic ACs and optionally against a real ACs doc.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validateQC, parseACTables } = require("./qc-validator");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

// ── Helper: write temp ACs doc and validate ──

const tmpDir = path.join(__dirname, ".test-tmp");

function setup() {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
}

function cleanup() {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function writeDoc(filename, content) {
  fs.writeFileSync(path.join(tmpDir, filename), content, "utf8");
}

// ── Test 1: Rubber stamp QC ──

console.log("\nTest 1: Rubber stamp QC ('Confirmed')");
setup();
writeDoc(
  "test1.md",
  `## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | Badge color | Static: screenshot | Blue badge | PASS — blue badge visible | Confirmed | |
| AC-FN-1 | API route | Code review | Returns 200 | PASS — returns 200 at route.ts:15 | Confirmed | |
`
);

let result = validateQC(tmpDir, "test1.md");
assert(!result.valid, "Should be invalid");
assert(result.issues.length === 2, `Should have 2 issues (got ${result.issues.length})`);
assert(
  result.issues[0].includes("rubber stamp"),
  `First issue should mention rubber stamp (got: ${result.issues[0]})`
);

// ── Test 2: Substantive QC ──

console.log("\nTest 2: Substantive QC (should pass)");
writeDoc(
  "test2.md",
  `## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | Badge color | Static: screenshot | Blue badge | PASS — blue badge visible | PASS — record-utils.ts:12 returns bg-blue-100 class, confirmed in screenshot | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | API route | Code review | Returns 200 | PASS — returns 200 at route.ts:15 | Route handler validates with Zod schema and returns correct status code | |
`
);

result = validateQC(tmpDir, "test2.md");
assert(result.valid, "Should be valid");
assert(result.issues.length === 0, `Should have 0 issues (got ${result.issues.length})`);

// ── Test 3: Empty QC ──

console.log("\nTest 3: Empty QC column");
writeDoc(
  "test3.md",
  `## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | API route | Code review | Returns 200 | PASS — returns 200 | | |
| AC-FN-2 | Auth check | Code review | Returns 403 | PASS — returns 403 |  | |
`
);

result = validateQC(tmpDir, "test3.md");
assert(!result.valid, "Should be invalid");
assert(result.issues.length === 2, `Should have 2 issues (got ${result.issues.length})`);
assert(
  result.issues[0].includes("empty"),
  `Issue should mention empty (got: ${result.issues[0]})`
);

// ── Test 4: UI AC without visual evidence ──

console.log("\nTest 4: UI AC without screenshot/visual evidence");
writeDoc(
  "test4.md",
  `## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | Badge color | Static: screenshot | Blue badge | PASS — blue badge visible | The implementation follows the standard pattern correctly | |
`
);

result = validateQC(tmpDir, "test4.md");
assert(!result.valid, "Should be invalid");
assert(result.issues.length === 1, `Should have 1 issue (got ${result.issues.length})`);
assert(
  result.issues[0].includes("UI AC") && result.issues[0].includes("visual evidence"),
  `Issue should mention UI AC visual evidence (got: ${result.issues[0]})`
);

// ── Test 5: QC echoes Agent column ──

console.log("\nTest 5: QC echoes Agent column text");
writeDoc(
  "test5.md",
  `## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | API route | Code review | Returns 200 | PASS — returns 200 at route.ts:15 with Zod validation | PASS — returns 200 at route.ts:15 with Zod validation confirmed | |
`
);

result = validateQC(tmpDir, "test5.md");
assert(!result.valid, "Should be invalid");
assert(result.issues.length === 1, `Should have 1 issue (got ${result.issues.length})`);
assert(
  result.issues[0].includes("overlap") || result.issues[0].includes("substring"),
  `Issue should mention overlap or substring (got: ${result.issues[0]})`
);

// ── Test 5b: Escaped pipes in Agent column ──

console.log("\nTest 5b: Escaped pipes (\\|) in Agent column don't break parsing");
writeDoc(
  "test5b.md",
  `## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-8 | Completed tab | Interactive | DELIVERED visible | CODE_REVIEW PASS: filter: SHIPPED \\| DELIVERED \\| PICKED_UP | Confirmed | |
`
);

result = validateQC(tmpDir, "test5b.md");
assert(!result.valid, "Should be invalid (rubber stamp)");
assert(result.issues.length === 1, `Should have 1 issue (got ${result.issues.length})`);
assert(
  result.issues[0].includes("AC-UI-8") && result.issues[0].includes("rubber stamp"),
  `Issue should flag AC-UI-8 rubber stamp (got: ${result.issues[0]})`
);

// ── Test 6: No ACs doc (should skip) ──

console.log("\nTest 6: No ACs doc file (should skip)");
result = validateQC(tmpDir, "nonexistent-ACs.md");
assert(result.valid, "Should be valid (skipped)");
assert(result.skipped === true, "Should be skipped");

// ── Test 7: No ACs doc path (should skip) ──

console.log("\nTest 7: No ACs doc path provided (should skip)");
result = validateQC(tmpDir, "");
assert(result.valid, "Should be valid (skipped)");
assert(result.skipped === true, "Should be skipped");

// ── Test 8: Min substance after prefix strip ──

console.log("\nTest 8: Minimum substance after stripping prefix");
writeDoc(
  "test8.md",
  `## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | API route | Code review | Returns 200 | PASS — returns 200 | PASS — looks ok | |
`
);

result = validateQC(tmpDir, "test8.md");
assert(!result.valid, "Should be invalid (too short)");
assert(
  result.issues[0].includes("lacks substance"),
  `Issue should mention substance (got: ${result.issues[0]})`
);

// ── Test 9: Multiple tables (UI + FN + REG) ──

console.log("\nTest 9: Multiple tables parsed correctly");
writeDoc(
  "test9.md",
  `## UI Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-UI-1 | Badge | Screenshot | Blue | PASS | Badge renders blue at record-utils.ts:12 | |

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-FN-1 | Route | Code review | 200 | PASS | Route handler validates input with Zod at route.ts:25 | |

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|-----|----------|
| AC-REG-1 | Tests pass | Test run | All green | PASS | 845 tests pass, precheck clean, no regressions found | |
`
);

const parsed = parseACTables(
  fs.readFileSync(path.join(tmpDir, "test9.md"), "utf8")
);
assert(parsed.length === 3, `Should parse 3 ACs (got ${parsed.length})`);
assert(parsed[0].isUI === true, "First AC should be UI");
assert(parsed[1].isUI === false, "Second AC should not be UI");

result = validateQC(tmpDir, "test9.md");
assert(result.valid, "Should be valid");

// ── Test 10: Real ACs doc (if exists) ──

console.log("\nTest 10: Real ACs doc (order-delivery-tracking-ACs.md)");
const projectDir = path.resolve(__dirname, "..", "..");
const realDoc = "docs/plans/order-delivery-tracking-ACs.md";
const realDocPath = path.join(projectDir, realDoc);

if (fs.existsSync(realDocPath)) {
  result = validateQC(projectDir, realDoc);
  if (result.valid) {
    console.log(`  ✓ Real doc passes QC validation (all entries substantive)`);
    passed++;
  } else {
    console.log(`  ✓ Real doc flagged ${result.issues.length} issues:`);
    passed++;
    result.issues.forEach((issue) => {
      console.log(`    → ${issue}`);
    });
  }
} else {
  console.log("  (skipped — real doc not found)");
}

// ── Cleanup ──

cleanup();

// ── Summary ──

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed!");
  process.exit(0);
}
