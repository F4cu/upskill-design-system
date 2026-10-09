#!/usr/bin/env node
// Context-budget gate for the always-loaded instruction surface (ADR-017,
// ADR-029). CLAUDE.md and AGENTS.md are injected into every session; past
// ~200 lines adherence measurably drops — instructions get lost in the noise.
// Growth must be routed per CLAUDE.md "Where knowledge lives" (AGENTS.md,
// path-scoped rules, commands, ADRs, docs), not appended here.
//
// Budgets: CLAUDE.md's own size, AGENTS.md's size, and the effective size of
// everything that loads at launch (CLAUDE.md + its resolved @imports +
// AGENTS.md, which Claude Code also loads natively). An import moves bytes,
// it doesn't save them, so the effective size is what protects the prefix.
// A line present in both root files fails: content moves, it isn't copied.
//
// Tier 1 (ADR-029): package conventions live in nested AGENTS.md files.
// Claude Code doesn't read a nested AGENTS.md on its own, so each needs a
// sibling CLAUDE.md importing it; Claude Code loads that lazily, only when the
// session reads a file under the directory. Each pair is budgeted, and
// .claude/rules/ must stay empty so conventions have one home.
//
//   Usage: npm run claudemd:check

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_LINES = 200;
const MAX_BYTES = 20000;
const MAX_AGENTS_BYTES = 8000;
const MAX_EFFECTIVE_BYTES = 24000;
const MAX_NESTED_BYTES = 16000;
const MIN_DUPLICATE_LENGTH = 40;

const failures = [];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const size = (text) => Buffer.byteLength(text, "utf8");

const claudeMd = read("CLAUDE.md");
const agentsMd = read("AGENTS.md");
const lines = claudeMd.split("\n").length;
const bytes = size(claudeMd);
const agentsBytes = size(agentsMd);

if (lines > MAX_LINES) {
  failures.push(
    `CLAUDE.md is ${lines} lines (budget: ${MAX_LINES}). Route the overflow per "Where knowledge lives".`
  );
}
if (bytes > MAX_BYTES) {
  failures.push(
    `CLAUDE.md is ${bytes} bytes (budget: ${MAX_BYTES}). Route the overflow per "Where knowledge lives".`
  );
}
if (agentsBytes > MAX_AGENTS_BYTES) {
  failures.push(
    `AGENTS.md is ${agentsBytes} bytes (budget: ${MAX_AGENTS_BYTES}). It holds invariants and pointers only (ADR-029).`
  );
}
if (agentsMd.includes("<!-- figma-cli rules")) {
  failures.push(
    "AGENTS.md contains a figma-cli rules block. Delete it; figma-cli rules live in .claude/commands/figma-cli.md."
  );
}

function resolveImports(rel, seen) {
  if (seen.has(rel)) return;
  seen.add(rel);
  for (const match of read(rel).matchAll(/^@(\S+)\s*$/gm)) {
    const target = path.normalize(path.join(path.dirname(rel), match[1]));
    if (!fs.existsSync(path.join(ROOT, target))) {
      failures.push(`${rel} imports @${match[1]}, which does not exist.`);
      continue;
    }
    resolveImports(target, seen);
  }
}

const loaded = new Set();
resolveImports("CLAUDE.md", loaded);
loaded.add("AGENTS.md");
const effectiveBytes = [...loaded].reduce((sum, rel) => sum + size(read(rel)), 0);

if (effectiveBytes > MAX_EFFECTIVE_BYTES) {
  failures.push(
    `Always-loaded context is ${effectiveBytes} bytes (${[...loaded].join(" + ")}; budget: ${MAX_EFFECTIVE_BYTES}).`
  );
}

const normalise = (line) => line.trim().replace(/\s+/g, " ").toLowerCase();
const agentsLines = new Set(
  agentsMd.split("\n").map(normalise).filter((l) => l.length >= MIN_DUPLICATE_LENGTH)
);
for (const line of new Set(claudeMd.split("\n").map(normalise))) {
  if (agentsLines.has(line)) {
    failures.push(`Line appears in both CLAUDE.md and AGENTS.md (keep one home): "${line.slice(0, 80)}…"`);
  }
}

const rulesDir = path.join(ROOT, ".claude", "rules");
if (fs.existsSync(rulesDir)) {
  for (const file of fs.readdirSync(rulesDir).filter((f) => f.endsWith(".md"))) {
    failures.push(
      `.claude/rules/${file} exists. Package conventions live in a nested AGENTS.md with a sibling CLAUDE.md importing it (ADR-029 Tier 1).`
    );
  }
}

const nested = execSync("git ls-files --cached --others --exclude-standard", { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter((rel) => /\/AGENTS\.md$/.test(rel) && fs.existsSync(path.join(ROOT, rel)));
const nestedSummary = [];
for (const rel of nested) {
  const sibling = path.join(path.dirname(rel), "CLAUDE.md");
  const siblingPath = path.join(ROOT, sibling);
  if (!fs.existsSync(siblingPath) || !/^@AGENTS\.md\s*$/m.test(read(sibling))) {
    failures.push(`${rel} has no sibling CLAUDE.md containing \`@AGENTS.md\`, so Claude Code never loads it.`);
    continue;
  }
  const nestedBytes = size(read(rel)) + size(read(sibling));
  nestedSummary.push(`${path.dirname(rel)} ${nestedBytes}/${MAX_NESTED_BYTES}`);
  if (nestedBytes > MAX_NESTED_BYTES) {
    failures.push(
      `${rel} + ${sibling} is ${nestedBytes} bytes (budget: ${MAX_NESTED_BYTES}). Move procedures to commands and per-component knowledge to metadata.`
    );
  }
}

if (failures.length) {
  console.error("claudemd:check failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  `claudemd:check passed: CLAUDE.md ${lines}/${MAX_LINES} lines, ${bytes}/${MAX_BYTES} bytes; ` +
    `AGENTS.md ${agentsBytes}/${MAX_AGENTS_BYTES} bytes; always-loaded ${effectiveBytes}/${MAX_EFFECTIVE_BYTES} bytes; ` +
    `nested ${nestedSummary.join(", ") || "none"}.`
);
