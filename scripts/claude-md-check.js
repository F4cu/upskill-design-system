#!/usr/bin/env node
// Context-budget gate for the always-loaded instruction surface (ADR-017).
// CLAUDE.md is injected into every session; past ~200 lines adherence
// measurably drops — instructions get lost in the noise. Growth must be
// routed per CLAUDE.md "Where knowledge lives" (path-scoped rules,
// commands, ADRs, docs), not appended here.
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

const failures = [];

const claudeMd = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
const lines = claudeMd.split("\n").length;
const bytes = Buffer.byteLength(claudeMd, "utf8");

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

console.log(`claudemd:check passed: CLAUDE.md ${lines}/${MAX_LINES} lines, ${bytes}/${MAX_BYTES} bytes.`);
