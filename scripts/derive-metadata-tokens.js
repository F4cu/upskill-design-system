#!/usr/bin/env node
// Rewrites a component's metadata tokens.* from what its own CSS Module and TSX
// read, so a scaffold never hand-writes the list (ADR-029 Step 5: 8 of the 12
// Arm 2 gate retries were hand-listed tokens a child Text/Icon/Stack applies).
// Same read scan metadata:validate checks against, so the output passes it.
//
// Existing entries keep their category and order; new reads are appended under
// the category their top-level segment implies. TSX template reads
// (`var(--ds-size-avatar-${size})`) can't be enumerated, so listed entries that
// match the prefix are kept and the prefix is reported.
//
// Usage: npm run metadata:derive-tokens -- <Name>

import fs from "fs";
import path from "path";
import { ROOT, readJson, tokenSourceTree, tokenPathsByCssVar, componentTokenReads, tokenCategory, dotPathToCssVar } from "./lib.js";

const CATEGORIES = ["color", "spacing", "typography", "borderRadius", "other"];

const name = process.argv[2];
if (!name) {
  console.error("Usage: npm run metadata:derive-tokens -- <Name>");
  process.exit(2);
}

const dir = path.join(ROOT, "packages/components/src/components", name);
const metaFile = path.join(dir, `${name}.metadata.json`);
if (!fs.existsSync(metaFile)) {
  console.error(`No metadata at ${path.relative(ROOT, metaFile)} — scaffold the component first.`);
  process.exit(2);
}

const meta = readJson(metaFile);
const pathByCssVar = tokenPathsByCssVar(tokenSourceTree());
const { cssVars, tsxVars, tsxPrefixes } = componentTokenReads(dir);

const before = meta.tokens ?? {};
const tokens = Object.fromEntries(Object.keys(before).map((c) => [c, []]));
const placed = new Set();
const place = (category, dotPath) => {
  if (placed.has(dotPath)) return;
  placed.add(dotPath);
  (tokens[category] ??= []).push(dotPath);
};

const read = new Set([...cssVars, ...tsxVars]);
for (const [category, refs] of Object.entries(before)) {
  for (const ref of refs) {
    const cssVar = dotPathToCssVar(ref);
    if (read.has(cssVar) || tsxPrefixes.some((p) => cssVar.startsWith(p))) place(category, ref);
  }
}

const unknown = [];
for (const cssVar of read) {
  const dotPath = pathByCssVar.get(cssVar);
  if (dotPath) place(tokenCategory(dotPath), dotPath);
  else unknown.push(cssVar);
}

// Existing keys keep their order; a new category lands in schema order after them.
const order = [...Object.keys(before), ...CATEGORIES.filter((c) => !(c in before))];
const derived = Object.fromEntries(order.filter((c) => c in tokens).map((c) => [c, tokens[c]]));
if (JSON.stringify(derived) !== JSON.stringify(before)) {
  meta.tokens = derived;
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n");
}

const listedBefore = new Set(Object.values(before).flat());
const added = [...placed].filter((p) => !listedBefore.has(p));
const removed = [...listedBefore].filter((p) => !placed.has(p));
console.log(`${path.relative(ROOT, metaFile)}: ${placed.size} token(s)`);
for (const p of added) console.log(`  + ${p}`);
for (const p of removed) console.log(`  - ${p} (not read by ${name}.module.css or index.tsx)`);
for (const p of tsxPrefixes) console.log(`  ? ${p}\${…} template read in index.tsx — list the tokens it can resolve to by hand`);
if (unknown.length) {
  for (const v of unknown) console.error(`  ✗ ${v} is read but is not a token in packages/tokens/src`);
  process.exit(1);
}
