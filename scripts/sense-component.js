#!/usr/bin/env node
// Pure aggregation (no AI, no live API calls): narrows the frozen-memory baseline
// to a single component, written to .claude/handoff/<Name>.snapshot.json — the
// frozen context the component loop's scaffold stage reads instead of calling
// Airtable or Figma live (ADR-007, Phase 9 stage 0).
//
// Works greenfield (no metadata file yet — the loop's first job is to author it)
// and on an existing component (narrows to its declared tokens). The snapshot's
// value over the raw token source is governance status: chiefly the deprecation
// guardrail (tokens the scaffold must NOT use), plus the frozen Figma node/drift
// state so the scaffold stage makes zero live calls.
//
//   Usage: npm run sense:component <Name>

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const GOVERNANCE_PATH = path.resolve(ROOT, "packages/tokens/airtable-governance.json");
const USAGE_PATH      = path.resolve(ROOT, "packages/tokens/token-usage.json");
const FIGMA_PATH      = path.resolve(ROOT, "packages/tokens/figma-variables.json");
const COMPONENTS_DIR  = path.resolve(ROOT, "packages/components/src/components");
const SCHEMA_PATH     = path.resolve(ROOT, "packages/components/component.schema.json");
const HANDOFF_DIR     = path.resolve(ROOT, ".claude/handoff");

const STALE_AFTER_DAYS = 30;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function rel(absPath) {
  return path.relative(ROOT, absPath);
}

// dot-path token → SD CSS custom property, e.g. color.terracotta.9 → --ds-color-terracotta-9
function dotPathToCssVar(dotPath) {
  return "--ds-" + dotPath.replace(/\./g, "-");
}

function usageCountFor(dotPath, usage) {
  const files = new Set();
  for (const f of usage.aliases?.[dotPath] ?? []) files.add(f);
  for (const f of usage.css?.[dotPathToCssVar(dotPath)] ?? []) files.add(f);
  return files.size;
}

function daysBetween(isoDate, now) {
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((now - then) / 86_400_000);
}

// Governance keys live under either section; absent = active by convention (see airtable-pull.js).
// Keys starting with '$' (e.g. $comment) are metadata, not a governed section.
function governanceFor(dotPath, governance) {
  for (const [section, records] of Object.entries(governance)) {
    if (section.startsWith("$")) continue;
    if (records[dotPath]) return records[dotPath];
  }
  return null;
}

function deprecatedTokens(governance) {
  const out = [];
  for (const [section, records] of Object.entries(governance)) {
    if (section.startsWith("$")) continue;
    for (const [token, r] of Object.entries(records)) {
      if (r.status === "deprecated") out.push({ token, successor: r.successor });
    }
  }
  return out;
}

function loadMetadata(name) {
  const p = path.join(COMPONENTS_DIR, name, `${name}.metadata.json`);
  return fs.existsSync(p) ? readJson(p) : null;
}

function declaredTokenContext(metadata, governance, usage) {
  if (!metadata) return [];
  const out = [];
  for (const [category, tokens] of Object.entries(metadata.tokens ?? {})) {
    for (const token of tokens) {
      const gov = governanceFor(token, governance);
      out.push({
        token,
        category,
        status: gov?.status ?? "active (ungoverned)",
        successor: gov?.successor ?? null,
        usageCount: usageCountFor(token, usage),
      });
    }
  }
  return out;
}

function figmaContext(metadata, now) {
  const nodeId =
    metadata?.component?.figmaNodeId && !/^none/i.test(metadata.component.figmaNodeId)
      ? metadata.component.figmaNodeId
      : null;

  const snapshot = { present: false, capturedAt: null, ageDays: null, stale: false };
  if (fs.existsSync(FIGMA_PATH)) {
    const figma = readJson(FIGMA_PATH);
    snapshot.present = true;
    snapshot.capturedAt = figma.capturedAt ?? null;
    snapshot.ageDays = snapshot.capturedAt ? daysBetween(snapshot.capturedAt, now) : null;
    snapshot.stale = snapshot.ageDays !== null && snapshot.ageDays > STALE_AFTER_DAYS;
  }

  return {
    nodeId,
    snapshot,
    note: "Code is the source of truth (ADR-002). Figma is a downstream drift mirror, captured interactively via the Figma MCP — no live call here. If the snapshot is absent or stale, refresh it with /figma-variable-audit before relying on drift.",
  };
}

function siblingComponents(name) {
  if (!fs.existsSync(COMPONENTS_DIR)) return [];
  return fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== name)
    .map((e) => e.name)
    .sort();
}

function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: npm run sense:component <Name>");
    process.exit(1);
  }

  const now = new Date();
  const governance = readJson(GOVERNANCE_PATH);
  const usage = readJson(USAGE_PATH);
  const metadata = loadMetadata(name);

  const snapshot = {
    component: name,
    generatedAt: now.toISOString(),
    exists: metadata !== null,
    note: metadata
      ? "Existing component — narrowed to its declared tokens for re-scaffold/refinement."
      : "Greenfield component — no metadata yet. The scaffold stage authors it from the schema; pick active tokens and avoid the deprecation guardrail below.",
    metadata,
    figma: figmaContext(metadata, now),
    tokens: {
      declared: declaredTokenContext(metadata, governance, usage),
      deprecatedAvoid: deprecatedTokens(governance),
    },
    siblings: siblingComponents(name),
    schema: rel(SCHEMA_PATH),
    sources: {
      governance: rel(GOVERNANCE_PATH),
      tokenUsage: rel(USAGE_PATH),
      figmaVariables: fs.existsSync(FIGMA_PATH) ? rel(FIGMA_PATH) : null,
    },
  };

  fs.mkdirSync(HANDOFF_DIR, { recursive: true });
  const outPath = path.join(HANDOFF_DIR, `${name}.snapshot.json`);
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");

  console.log(`Wrote ${rel(outPath)} (${snapshot.exists ? "existing" : "greenfield"})`);
}

main();
