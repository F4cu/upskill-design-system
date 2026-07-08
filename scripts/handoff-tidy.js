#!/usr/bin/env node
// Deterministic tidy pass for .claude/handoff/: archives done/superseded markdown
// handoffs and regenerates handoff/index.json, the single file future sessions
// read instead of globbing the directory (see CLAUDE.md "Handoff artifacts").
//
//   Usage: npm run handoff:tidy

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDOFF_DIR = path.resolve(ROOT, ".claude/handoff");
const ARCHIVE_DIR = path.join(HANDOFF_DIR, "archive");
const RUNS_DIR = path.join(HANDOFF_DIR, "runs");

const ARCHIVABLE_STATUSES = new Set(["done", "superseded"]);

function rel(absPath) {
  return path.relative(ROOT, absPath);
}

function parseFrontmatter(filePath, raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error(`${rel(filePath)}: missing frontmatter (status/created/completed)`);
  }
  const fields = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  if (!fields.status || !fields.created) {
    throw new Error(`${rel(filePath)}: frontmatter missing required status/created field`);
  }
  return fields;
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => path.join(dir, e.name));
}

function kindFor(filePath) {
  return filePath.endsWith(".handoff.md") ? "handoff" : "spec";
}

function mtimeIso(filePath) {
  return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
}

function main() {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.mkdirSync(RUNS_DIR, { recursive: true });

  const entries = [];

  for (const filePath of listMarkdownFiles(HANDOFF_DIR)) {
    const raw = fs.readFileSync(filePath, "utf8");
    const fm = parseFrontmatter(filePath, raw);
    const kind = kindFor(filePath);
    let finalPath = filePath;

    if (ARCHIVABLE_STATUSES.has(fm.status)) {
      const dest = path.join(ARCHIVE_DIR, path.basename(filePath));
      fs.renameSync(filePath, dest);
      finalPath = dest;
      console.log(`Archived ${rel(filePath)} -> ${rel(dest)}`);
    }

    entries.push({
      name: path.basename(finalPath).replace(/\.handoff\.md$|\.md$/, ""),
      kind,
      status: fm.status,
      created: fm.created,
      updated: mtimeIso(finalPath),
      path: rel(finalPath),
    });
  }

  for (const filePath of listMarkdownFiles(ARCHIVE_DIR)) {
    if (entries.some((e) => e.path === rel(filePath))) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    const fm = parseFrontmatter(filePath, raw);
    entries.push({
      name: path.basename(filePath).replace(/\.handoff\.md$|\.md$/, ""),
      kind: kindFor(filePath),
      status: fm.status,
      created: fm.created,
      updated: mtimeIso(filePath),
      path: rel(filePath),
    });
  }

  if (fs.existsSync(RUNS_DIR)) {
    for (const name of fs.readdirSync(RUNS_DIR)) {
      if (!name.endsWith(".json")) continue;
      const filePath = path.join(RUNS_DIR, name);
      entries.push({
        name: name.replace(/\.json$/, ""),
        kind: "run",
        status: "in-flight",
        created: mtimeIso(filePath),
        updated: mtimeIso(filePath),
        path: rel(filePath),
      });
    }
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  const indexPath = path.join(HANDOFF_DIR, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(entries, null, 2) + "\n");
  console.log(`Wrote ${rel(indexPath)} (${entries.length} entries)`);
}

main();
