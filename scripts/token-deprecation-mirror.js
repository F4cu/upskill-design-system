#!/usr/bin/env node
// Mirrors Airtable deprecation state (packages/tokens/airtable-governance.json)
// into the DTCG `$deprecated` property on the committed token source.
// primitives.* → packages/tokens/src/primitives.json
// semantic.*   → packages/tokens/src/theme/{light,dark}.json (whichever has the path)
//
// `--check` compares the expected result against what's on disk and exits 1
// without writing if anything is out of sync (used in CI, tokens-check.yml).

import fs from "fs";
import path from "path";
import { ROOT, readJson, flattenDTCG } from "./lib.js";

const CHECK = process.argv.includes("--check");

const GOVERNANCE_PATH = path.resolve(ROOT, "packages/tokens/airtable-governance.json");
const PRIMITIVES_PATH = path.resolve(ROOT, "packages/tokens/src/primitives.json");
const THEME_PATHS = {
  light: path.resolve(ROOT, "packages/tokens/src/theme/light.json"),
  dark: path.resolve(ROOT, "packages/tokens/src/theme/dark.json"),
};

// Finds the leaf node ({ $type, $value, ... }) at `dotPath` inside `root`,
// returning null if any segment along the way doesn't exist or isn't a leaf.
function resolveLeaf(root, dotPath) {
  const segments = dotPath.split(".");
  let node = root;
  for (const segment of segments) {
    if (node == null || typeof node !== "object" || !(segment in node)) return null;
    node = node[segment];
  }
  if (node == null || typeof node !== "object" || node.$type === undefined || node.$value === undefined) {
    return null;
  }
  return node;
}

function deprecatedValueFor(entry) {
  return entry.successor ? `Replaced by {${entry.successor}}.` : true;
}

// Rebuilds the leaf object with a stable key order: $type, $value, $deprecated
// (then anything else already present), so writes are deterministic and a
// no-op run produces zero diff.
function withDeprecated(leaf, value) {
  const { $type, $value, $deprecated, ...rest } = leaf;
  return { $type, $value, ...rest, $deprecated: value };
}

function withoutDeprecated(leaf) {
  if (!("$deprecated" in leaf)) return leaf;
  const { $deprecated, ...rest } = leaf;
  return rest;
}

// Replaces the leaf found at `dotPath` in `root` with `newLeaf`, mutating in
// place. Assumes resolveLeaf(root, dotPath) already succeeded.
function replaceLeaf(root, dotPath, newLeaf) {
  const segments = dotPath.split(".");
  let node = root;
  for (let i = 0; i < segments.length - 1; i++) node = node[segments[i]];
  node[segments[segments.length - 1]] = newLeaf;
}

// Applies governance entries for one section against one source tree.
// Returns { changed, warnings } — `changed` is true if any leaf differed from
// the desired state (used to decide whether the file needs writing).
function applySection(entries, root, { warnOnMissing = true } = {}) {
  const warnings = [];
  let changed = false;

  for (const [dotPath, entry] of Object.entries(entries)) {
    const leaf = resolveLeaf(root, dotPath);
    if (!leaf) {
      if (warnOnMissing) warnings.push(dotPath);
      continue;
    }

    if (entry.status === "deprecated") {
      const desired = withDeprecated(leaf, deprecatedValueFor(entry));
      if (JSON.stringify(leaf) !== JSON.stringify(desired)) {
        replaceLeaf(root, dotPath, desired);
        changed = true;
      }
    } else {
      const desired = withoutDeprecated(leaf);
      if (JSON.stringify(leaf) !== JSON.stringify(desired)) {
        replaceLeaf(root, dotPath, desired);
        changed = true;
      }
    }
  }

  return { changed, warnings };
}

// Finds dot-paths in `root` whose leaf carries `$deprecated` but which aren't
// a key in `governedPaths` — governance is upstream, so a marker on a token
// governance doesn't mention is left untouched but flagged (should never
// happen in practice).
function findUngovernedDeprecations(root, governedPaths) {
  return flattenDTCG(root, (tokenPath, leaf) => (leaf.$deprecated !== undefined ? tokenPath : null)).filter(
    (tokenPath) => tokenPath && !governedPaths.has(tokenPath)
  );
}

function writeIfChanged(filePath, root, changed, results) {
  if (!changed) return false;
  if (CHECK) {
    results.push(filePath);
    return true;
  }
  fs.writeFileSync(filePath, JSON.stringify(root, null, 2) + "\n");
  return true;
}

function main() {
  const governance = readJson(GOVERNANCE_PATH);
  const primitives = readJson(PRIMITIVES_PATH);
  const theme = {
    light: readJson(THEME_PATHS.light),
    dark: readJson(THEME_PATHS.dark),
  };

  const outOfSync = [];
  let anyWarnings = false;

  // primitives.* → primitives.json
  const primResult = applySection(governance.primitives ?? {}, primitives);
  for (const w of primResult.warnings) {
    console.warn(`Warning: governance path "${w}" (primitives) does not resolve to a leaf token in primitives.json`);
    anyWarnings = true;
  }
  writeIfChanged(PRIMITIVES_PATH, primitives, primResult.changed, outOfSync);

  const governedPrimitivePaths = new Set(Object.keys(governance.primitives ?? {}));
  for (const tokenPath of findUngovernedDeprecations(primitives, governedPrimitivePaths)) {
    console.warn(`Warning: "${tokenPath}" (primitives.json) has $deprecated but is not listed in airtable-governance.json — left untouched`);
    anyWarnings = true;
  }

  // semantic.* → theme/light.json + theme/dark.json (whichever resolves)
  const semanticEntries = governance.semantic ?? {};
  const governedSemanticPaths = new Set(Object.keys(semanticEntries));
  for (const mode of ["light", "dark"]) {
    const result = applySection(semanticEntries, theme[mode], { warnOnMissing: false });
    writeIfChanged(THEME_PATHS[mode], theme[mode], result.changed, outOfSync);

    for (const tokenPath of findUngovernedDeprecations(theme[mode], governedSemanticPaths)) {
      console.warn(`Warning: "${tokenPath}" (theme/${mode}.json) has $deprecated but is not listed in airtable-governance.json — left untouched`);
      anyWarnings = true;
    }
  }

  // Warn once per semantic path that resolves in neither theme file.
  for (const dotPath of Object.keys(semanticEntries)) {
    const inLight = resolveLeaf(theme.light, dotPath);
    const inDark = resolveLeaf(theme.dark, dotPath);
    if (!inLight && !inDark) {
      console.warn(`Warning: governance path "${dotPath}" (semantic) does not resolve to a leaf token in theme/light.json or theme/dark.json`);
      anyWarnings = true;
    }
  }

  if (CHECK) {
    if (outOfSync.length > 0) {
      console.error("Out of sync with Airtable governance — run `npm run tokens:deprecations` to fix:");
      for (const f of outOfSync) console.error(`  ${path.relative(ROOT, f)}`);
      process.exit(1);
    }
    console.log("Token deprecation state is in sync with governance.");
    return;
  }

  console.log("Token deprecation state mirrored from governance.");
}

main();
