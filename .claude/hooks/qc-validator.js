// .claude/hooks/qc-validator.js
//
// Shared QC quality validator for verification hooks.
// Validates that QC column entries in ACs tracking docs are substantive,
// not rubber stamps, and independent from Agent column entries.
//
// Usage:
//   const { validateQC } = require('./qc-validator');
//   const result = validateQC(projectDir, 'docs/plans/feature-ACs.md');
//   // result: { valid: boolean, issues: string[], skipped?: boolean }

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

// Single-word or very short rubber-stamp phrases (case-insensitive)
const RUBBER_STAMPS = [
  "confirmed",
  "pass",
  "ok",
  "okay",
  "yes",
  "lgtm",
  "looks good",
  "verified",
  "approved",
  "agree",
  "correct",
  "good",
  "fine",
  "accepted",
  "no issues",
  "all good",
];

// Minimum substantive characters after stripping common prefixes like "PASS —"
const MIN_SUBSTANCE_CHARS = 15;

// Keywords that count as visual observation evidence for UI ACs
const UI_EVIDENCE_KEYWORDS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  "screenshot",
  "file:",
  "line ",
  "line:",
  ":line",
  "visible",
  "renders",
  "rendered",
  "displays",
  "displayed",
  "shows",
  "shown",
  "appears",
  "layout",
  "color",
  "badge",
  "button",
  "dialog",
  "modal",
  "text ",
  "label",
  "column",
  "row",
  "tab",
  "icon",
  "image",
];

/**
 * Parse markdown tables from ACs doc that have both "Agent" and "QC" headers.
 * Returns array of { ac, agent, qc, isUI } objects.
 */
function parseACTables(content) {
  const lines = content.split("\n");
  const results = [];

  let inTable = false;
  let acIdx = -1;
  let agentIdx = -1;
  let qcIdx = -1;
  let separatorSeen = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect table header row (has pipes and both "Agent" and "QC")
    if (
      line.startsWith("|") &&
      /\bAgent\b/i.test(line) &&
      /\bQC\b/i.test(line)
    ) {
      const headers = line
        .split("|")
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      acIdx = headers.findIndex((h) => /^AC$/i.test(h));
      agentIdx = headers.findIndex((h) => /^Agent$/i.test(h));
      qcIdx = headers.findIndex((h) => /^QC$/i.test(h));

      if (acIdx >= 0 && agentIdx >= 0 && qcIdx >= 0) {
        inTable = true;
        separatorSeen = false;
        continue;
      }
    }

    // Skip separator row (|---|---|...)
    if (inTable && !separatorSeen && /^\|[\s\-|:]+\|$/.test(line)) {
      separatorSeen = true;
      continue;
    }

    // Parse data rows
    if (inTable && separatorSeen && line.startsWith("|")) {
      const rawCells = splitTableRow(line);

      if (rawCells.length > Math.max(acIdx, agentIdx, qcIdx)) {
        const ac = rawCells[acIdx] || "";
        const agent = rawCells[agentIdx] || "";
        const qc = rawCells[qcIdx] || "";
        const isUI = /^AC-UI/i.test(ac);

        results.push({ ac, agent, qc, isUI });
      }
    }

    // End of table (non-pipe line after table started)
    if (inTable && separatorSeen && !line.startsWith("|") && line.length > 0) {
      inTable = false;
      acIdx = -1;
      agentIdx = -1;
      qcIdx = -1;
      separatorSeen = false;
    }
  }

  return results;
}

/**
 * Split a markdown table row into cells, preserving empty cells.
 * Handles escaped pipes (\|) inside cell content.
 */
function splitTableRow(line) {
  // Remove leading and trailing pipe
  let inner = line.trim();
  if (inner.startsWith("|")) inner = inner.slice(1);
  if (inner.endsWith("|")) inner = inner.slice(0, -1);

  // Split on unescaped pipes only (not preceded by backslash)
  const cells = [];
  let current = "";
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "|" && (i === 0 || inner[i - 1] !== "\\")) {
      cells.push(current.trim());
      current = "";
    } else {
      current += inner[i];
    }
  }
  cells.push(current.trim());

  return cells;
}

/**
 * Strip common prefixes like "PASS —", "PASS:", "PASS -", "Confirmed." etc.
 * Returns the remaining text.
 */
function stripPrefix(text) {
  return text
    .replace(/^(PASS|FAIL|OK|Confirmed)\s*[—–\-:.]?\s*/i, "")
    .trim();
}

/**
 * Calculate word overlap ratio between two texts.
 * Returns ratio from 0 to 1 (1 = complete overlap).
 */
function wordOverlap(text1, text2) {
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  let overlap = 0;
  for (const w of words2) {
    if (words1.has(w)) overlap++;
  }

  return overlap / words2.size;
}

/**
 * Validate QC entries in an ACs tracking document.
 *
 * @param {string} projectDir - Absolute path to the project root
 * @param {string} acsDocRelPath - Relative path to the ACs doc from project root
 * @returns {{ valid: boolean, issues: string[], skipped?: boolean }}
 */
function validateQC(projectDir, acsDocRelPath) {
  if (!acsDocRelPath) {
    return { valid: true, issues: [], skipped: true };
  }

  const acsDocPath = path.resolve(projectDir, acsDocRelPath);

  if (!fs.existsSync(acsDocPath)) {
    return { valid: true, issues: [], skipped: true };
  }

  const content = fs.readFileSync(acsDocPath, "utf8");
  const acs = parseACTables(content);

  if (acs.length === 0) {
    return { valid: true, issues: [], skipped: true };
  }

  const issues = [];

  for (const { ac, agent, qc, isUI } of acs) {
    if (!ac) continue; // skip rows without AC identifier

    // Rule 1: Empty check
    if (!qc || qc.length === 0) {
      issues.push(`${ac}: QC column is empty`);
      continue;
    }

    // Rule 2: Rubber stamp detection
    const qcNormalized = qc.toLowerCase().replace(/[.\s]+$/, "").trim();
    if (RUBBER_STAMPS.includes(qcNormalized)) {
      issues.push(
        `${ac}: QC is a rubber stamp ("${qc}"). Write independent evidence.`
      );
      continue;
    }

    // Also catch single-word QC entries that aren't in the list
    if (!/\s/.test(qcNormalized) && qcNormalized.length < 15) {
      issues.push(
        `${ac}: QC is a single word ("${qc}"). Write substantive evidence.`
      );
      continue;
    }

    // Rule 3: Minimum substance after stripping prefix
    const stripped = stripPrefix(qc);
    if (stripped.length < MIN_SUBSTANCE_CHARS) {
      issues.push(
        `${ac}: QC lacks substance (${stripped.length} chars after prefix). Min ${MIN_SUBSTANCE_CHARS} chars of evidence required.`
      );
      continue;
    }

    // Rule 4: UI evidence (AC-UI-* only)
    if (isUI) {
      const qcLower = qc.toLowerCase();
      const hasKeyword = UI_EVIDENCE_KEYWORDS.some((kw) =>
        qcLower.includes(kw.toLowerCase())
      );
      // Also check for file:line patterns like "route.ts:15" or "Component.tsx:100-200"
      const hasFileLineRef = /\.\w+:\d+/.test(qc);
      if (!hasKeyword && !hasFileLineRef) {
        issues.push(
          `${ac}: UI AC QC lacks visual evidence (no screenshot ref, file:line, or visual observation keyword)`
        );
        continue;
      }
    }

    // Rule 5: Echo detection — QC is substring of Agent or >80% word overlap
    if (agent && agent.length > 0) {
      const agentLower = agent.toLowerCase();
      const qcLower = qc.toLowerCase();

      // Substring check (QC contained within Agent)
      if (agentLower.includes(qcLower)) {
        issues.push(
          `${ac}: QC is a substring of Agent column. Write independent evidence.`
        );
        continue;
      }

      // Word overlap check
      const overlap = wordOverlap(agent, qc);
      if (overlap > 0.8) {
        issues.push(
          `${ac}: QC has ${Math.round(overlap * 100)}% word overlap with Agent column. Write independent evidence.`
        );
        continue;
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

module.exports = { validateQC, parseACTables };
