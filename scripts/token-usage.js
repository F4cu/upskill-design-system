#!/usr/bin/env node
// Scans the repo for token references and writes packages/tokens/token-usage.json.
// Two maps:
//   css:     CSS custom property name → [files]  (var(--ds-*) in component source)
//   aliases: dot-path token → [files]            ({path.to.token} in theme/device JSON)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROOT, rel } from "./lib.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(ROOT, "packages/tokens/token-usage.json");

const CSS_SCAN_DIRS  = [path.resolve(ROOT, "packages/components/src")];
const ALIAS_SCAN_DIRS = [
  path.resolve(ROOT, "packages/tokens/src/theme"),
  path.resolve(ROOT, "packages/tokens/src/device"),
];

const CSS_EXTS   = new Set([".css", ".tsx", ".ts"]);
const JSON_EXTS  = new Set([".json"]);

function walkFiles(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, exts));
    else if (exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

// Scans `files` for matches of `re` (whose first capture group is the token),
// mapping each token to the deduped list of files referencing it. Shared by the
// CSS var() scan and the {alias} scan below — they differ only in the regex.
function buildTokenMap(files, re) {
  const map = {};
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const r = rel(file);
    for (const match of content.matchAll(re)) {
      const token = match[1];
      (map[token] ??= []);
      if (!map[token].includes(r)) map[token].push(r);
    }
  }
  return map;
}

function main() {
  const cssFiles   = CSS_SCAN_DIRS.flatMap((d) => walkFiles(d, CSS_EXTS));
  const aliasFiles = ALIAS_SCAN_DIRS.flatMap((d) => walkFiles(d, JSON_EXTS));

  const css     = buildTokenMap(cssFiles, /var\((--ds-[\w-]+)/g);
  const aliases = buildTokenMap(aliasFiles, /\{([\w][\w.-]*)\}/g);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ css, aliases }, null, 2) + "\n");

  console.log(`CSS tokens:   ${Object.keys(css).length}`);
  console.log(`Alias tokens: ${Object.keys(aliases).length}`);
  console.log(`Wrote token-usage.json`);
}

main();
