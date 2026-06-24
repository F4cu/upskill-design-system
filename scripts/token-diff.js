#!/usr/bin/env node
// Compares two built token dist directories and outputs a markdown PR comment.
// Usage: node scripts/token-diff.js <base-dist> <head-dist>

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const [,, baseDir, headDir] = process.argv;
if (!baseDir || !headDir) {
  process.stderr.write('Usage: node scripts/token-diff.js <base-dist> <head-dist>\n');
  process.exit(1);
}

const LABEL = {
  'primitives.css':     'Primitives',
  'theme.light.css':    'Theme — light',
  'theme.dark.css':     'Theme — dark',
  'device.desktop.css': 'Device — desktop',
  'device.tablet.css':  'Device — tablet',
  'device.mobile.css':  'Device — mobile',
};
// device.css is the combined output of the three device files — skip to avoid duplicate reporting
const SKIP = new Set(['device.css']);

function parseCss(dir, file) {
  const path = join(dir, 'css', file);
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  const tokens = {};
  const re = /^\s*(--ds-[a-z0-9-]+)\s*:\s*(.+?)\s*;/gm;
  let m;
  while ((m = re.exec(text)) !== null) tokens[m[1]] = m[2];
  return tokens;
}

function cssFiles() {
  const set = new Set();
  for (const dir of [baseDir, headDir]) {
    const cssDir = join(dir, 'css');
    if (existsSync(cssDir)) readdirSync(cssDir).filter(f => f.endsWith('.css')).forEach(f => set.add(f));
  }
  return [...set].filter(f => !SKIP.has(f)).sort();
}

const sections = [];
let totalAdded = 0, totalRemoved = 0, totalChanged = 0;

for (const file of cssFiles()) {
  const base = parseCss(baseDir, file);
  const head = parseCss(headDir, file);

  const changed = [], added = [], removed = [];
  for (const [k, v] of Object.entries(head)) {
    if (!(k in base)) added.push({ k, v });
    else if (base[k] !== v) changed.push({ k, before: base[k], after: v });
  }
  for (const [k, v] of Object.entries(base)) {
    if (!(k in head)) removed.push({ k, v });
  }

  if (!changed.length && !added.length && !removed.length) continue;

  totalAdded += added.length;
  totalRemoved += removed.length;
  totalChanged += changed.length;

  const title = LABEL[file] ?? file;
  const count = changed.length + added.length + removed.length;

  let body = '';
  if (changed.length) {
    body += `\n**Changed (${changed.length})**\n\n| Token | Before | After |\n|---|---|---|\n`;
    for (const { k, before, after } of changed) body += `| \`${k}\` | \`${before}\` | \`${after}\` |\n`;
  }
  if (added.length) {
    body += `\n**Added (${added.length})**\n\n`;
    for (const { k, v } of added) body += `- \`${k}: ${v}\`\n`;
  }
  if (removed.length) {
    body += `\n**Removed (${removed.length})**\n\n`;
    for (const { k, v } of removed) body += `- ~~\`${k}: ${v}\`~~\n`;
  }

  const section = count > 15
    ? `<details><summary><strong>${title}</strong> — ${count} changes</summary>\n${body}\n</details>`
    : `### ${title}\n${body}`;

  sections.push(section);
}

if (!sections.length) {
  process.stdout.write('<!-- token-diff -->\n> No token changes in this PR.\n');
  process.exit(0);
}

const summary = [
  totalChanged && `${totalChanged} changed`,
  totalAdded && `${totalAdded} added`,
  totalRemoved && `${totalRemoved} removed`,
].filter(Boolean).join(' · ');

process.stdout.write(`<!-- token-diff -->\n## Token diff\n\n> ${summary}\n\n${sections.join('\n\n')}\n`);
