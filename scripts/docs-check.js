#!/usr/bin/env node
// Staleness gate for the docs/ reference site (agentic-moments audit, step 2).
// Each docs/NN-*.md declares its load-bearing source files in frontmatter:
//
//   ---
//   sources:
//     - .claude/commands/*.md
//     - docs/decisions/007-verified-component-loop.md
//   ---
//
// The check fails when any source has a git commit strictly newer than the
// doc's last commit — i.e. the thing the doc describes changed after the doc
// was last touched. Detection is deterministic (this script, in CI);
// rewriting is a developer-triggered moment (/docs-sync). Comparison uses
// committed history only: uncommitted edits are invisible, which is fine
// because the gate runs on PRs.
//
//   Usage: npm run docs:check

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function lsFiles(pattern) {
  const out = git("ls-files", "--", pattern);
  return out ? out.split("\n") : [];
}

const commitTimeCache = new Map();
function lastCommitTime(relPath) {
  if (!commitTimeCache.has(relPath)) {
    const out = git("log", "-1", "--format=%ct", "--", relPath);
    commitTimeCache.set(relPath, out ? Number(out) : null);
  }
  return commitTimeCache.get(relPath);
}

function parseSources(docPath, raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error(`${docPath}: missing frontmatter — every docs page must declare its sources`);
  }
  const lines = match[1].split("\n");
  const sources = [];
  let inSources = false;
  for (const line of lines) {
    if (/^sources:\s*$/.test(line)) {
      inSources = true;
      continue;
    }
    const item = line.match(/^\s+-\s+(.+?)\s*$/);
    if (inSources && item) {
      sources.push(item[1]);
    } else if (!/^\s/.test(line)) {
      inSources = false;
    }
  }
  if (sources.length === 0) {
    throw new Error(`${docPath}: frontmatter has no sources list`);
  }
  return sources;
}

const docs = lsFiles("docs/[0-9][0-9]-*.md");
if (docs.length === 0) {
  console.error("docs-check: no docs/NN-*.md files found — wrong working directory?");
  process.exit(1);
}

const errors = [];
const staleDocs = [];

for (const doc of docs) {
  let sources;
  try {
    sources = parseSources(doc, fs.readFileSync(path.join(ROOT, doc), "utf8"));
  } catch (err) {
    errors.push(err.message);
    continue;
  }

  const docTime = lastCommitTime(doc);
  const stale = [];
  for (const pattern of sources) {
    const files = lsFiles(pattern);
    if (files.length === 0) {
      errors.push(`${doc}: source "${pattern}" matches no tracked files — typo or deleted source`);
      continue;
    }
    for (const file of files) {
      const sourceTime = lastCommitTime(file);
      if (sourceTime !== null && docTime !== null && sourceTime > docTime) {
        stale.push({ file, sourceTime });
      }
    }
  }
  if (stale.length > 0) {
    staleDocs.push({ doc, docTime, stale });
  }
}

for (const { doc, docTime, stale } of staleDocs) {
  const docDate = new Date(docTime * 1000).toISOString().slice(0, 10);
  console.error(`\n${doc} (last committed ${docDate}) is stale — sources committed more recently:`);
  for (const { file, sourceTime } of stale) {
    const date = new Date(sourceTime * 1000).toISOString().slice(0, 10);
    console.error(`  ${file} (${date})`);
  }
}
for (const message of errors) {
  console.error(`\n${message}`);
}

if (staleDocs.length > 0 || errors.length > 0) {
  console.error(
    "\ndocs-check failed. Run /docs-sync to rewrite the stale sections, or — if the doc" +
      "\nis still accurate — commit any change to the doc (e.g. its frontmatter) to reset it."
  );
  process.exit(1);
}

console.log(`docs-check: ${docs.length} docs checked, all current.`);
