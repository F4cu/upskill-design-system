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
// Also enforces that every .claude/rules/*.md declares `paths:`
// frontmatter — a rule without paths loads unconditionally into every
// session, which silently defeats the point of moving it out of CLAUDE.md.
//
//   Usage: npm run claudemd:check

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_LINES = 200;
const MAX_BYTES = 20000;
const MAX_AGENTS_BYTES = 8000;
const MAX_EFFECTIVE_BYTES = 24000;
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
    const content = fs.readFileSync(path.join(rulesDir, file), "utf8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatter || !/^paths:/m.test(frontmatter[1])) {
      failures.push(
        `.claude/rules/${file} has no \`paths:\` frontmatter — it would load into every session. Scope it or move it into CLAUDE.md within budget.`
      );
    }
  }
}

if (failures.length) {
  console.error("claudemd:check failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  `claudemd:check passed: CLAUDE.md ${lines}/${MAX_LINES} lines, ${bytes}/${MAX_BYTES} bytes; ` +
    `AGENTS.md ${agentsBytes}/${MAX_AGENTS_BYTES} bytes; always-loaded ${effectiveBytes}/${MAX_EFFECTIVE_BYTES} bytes.`
);
