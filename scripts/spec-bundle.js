#!/usr/bin/env node
// Builds specs.bundle.json, the one input both spec renderers read (ADR-030,
// Phase 0): the docs-site component pages and the Figma parity plugin. Per
// component: its spec, its metadata and a hash over both. Per token path any
// spec's styles reference: the CSS custom property, the resolved value in the
// default context (default brand, light theme, desktop) plus the contexts where
// it differs (dark, tablet, mobile), and its Figma variable from the committed
// mirror (figma-variables.json), or null when Figma has none.
//
// Derived and not committed (ADR-030 decision 4). Output is deterministic: no
// timestamps, components and tokens sorted, spec and metadata in source order,
// so two runs give byte-identical files.
// Fails when a token path does not resolve in the built CSS. Requires built
// tokens (npm run tokens:build).
//
// --out <file> writes elsewhere (default dist/specs.bundle.json).

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ROOT, readJson, rel, styleValueTokenPaths, dotPathToCssVar } from "./lib.js";

const COMPONENTS_DIR = path.join(ROOT, "packages/components/src/components");
const TOKENS_CSS_DIR = path.join(ROOT, "packages/tokens/dist/css");
const FIGMA_VARIABLES = path.join(ROOT, "packages/tokens/figma-variables.json");
const DEFAULT_BRAND = "upskill";

const outFlag = process.argv.indexOf("--out");
const OUT = path.resolve(outFlag === -1 ? path.join(ROOT, "dist/specs.bundle.json") : process.argv[outFlag + 1]);

if (!fs.existsSync(TOKENS_CSS_DIR)) {
  console.error("✗ packages/tokens/dist/css not found — run npm run tokens:build first.");
  process.exit(1);
}

// Built CSS → custom-property maps per cascade context. Order mirrors
// packages/components/src/styles/tokens.css: primitives → default brand →
// device → theme.light; dark, tablet and mobile override that base.
function declarations(css) {
  return Object.fromEntries([...css.matchAll(/(--ds-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const cssFile = (name) => fs.readFileSync(path.join(TOKENS_CSS_DIR, `${name}.css`), "utf8");
const [deviceBase, deviceTablet, deviceMobile] = cssFile("device").split(/@media[^{]+\{/);

const base = {
  ...declarations(cssFile("primitives")),
  ...declarations(cssFile(`brand.${DEFAULT_BRAND}`)),
  ...declarations(deviceBase),
  ...declarations(cssFile("theme.light")),
};
const overrides = {
  dark: declarations(cssFile("theme.dark")),
  tablet: declarations(deviceTablet),
  mobile: { ...declarations(deviceTablet), ...declarations(deviceMobile) },
};

function resolve(cssVar, vars, seen = []) {
  if (seen.includes(cssVar)) throw new Error(`alias cycle: ${[...seen, cssVar].join(" → ")}`);
  const value = vars[cssVar];
  if (value === undefined) return undefined;
  return value.replace(/var\((--ds-[a-z0-9-]+)\)/g, (_, ref) => {
    const inner = resolve(ref, vars, [...seen, cssVar]);
    if (inner === undefined) throw new Error(`${cssVar} references undefined ${ref}`);
    return inner;
  });
}

// Code dot-path → Figma variable name (naming map in /figma-variable-push).
const HUE_PREFIXED = new Set(["brand", "accent", "neutral"]);
function figmaName(dotPath) {
  const segs = dotPath.split(".");
  if (segs[0] === "color" && HUE_PREFIXED.has(segs[1]) && segs.length === 3 && segs[2] !== "default") {
    return `color/${segs[1]}/${segs[1]}-${segs[2]}`;
  }
  if (segs[0] === "color" && ["dark", "alpha"].includes(segs[segs.length - 2])) {
    return [...segs.slice(0, -2), `${segs[segs.length - 2]}-${segs[segs.length - 1]}`].join("/");
  }
  return segs.join("/");
}

const mirror = readJson(FIGMA_VARIABLES);
const figmaCollection = new Map();
for (const [collection, { variables }] of Object.entries(mirror.collections)) {
  for (const name of Object.keys(variables)) figmaCollection.set(name, collection);
}
const divergence = new Map([
  ...mirror.representationalDivergences.variables.map((v) => [v, "representational"]),
  ...mirror.structuralDivergences.variables.map((v) => [v, "structural"]),
]);

function figmaVariable(dotPath) {
  const name = figmaName(dotPath);
  const collection = figmaCollection.get(name);
  if (!collection) return null;
  return { name, collection, ...(divergence.has(name) && { divergence: divergence.get(name) }) };
}

const names = fs
  .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(COMPONENTS_DIR, e.name, `${e.name}.spec.json`)))
  .map((e) => e.name)
  .sort();

const components = {};
const tokenPaths = new Set();
for (const name of names) {
  const specRaw = fs.readFileSync(path.join(COMPONENTS_DIR, name, `${name}.spec.json`), "utf8");
  const metadataRaw = fs.readFileSync(path.join(COMPONENTS_DIR, name, `${name}.metadata.json`), "utf8");
  const hash = crypto.createHash("sha256").update(specRaw).update("\0").update(metadataRaw).digest("hex");
  const spec = JSON.parse(specRaw);
  const metadata = JSON.parse(metadataRaw);
  components[name] = { hash, spec, metadata };
  for (const rules of Object.values(spec.styles)) {
    for (const rule of rules) for (const value of Object.values(rule.set)) for (const t of styleValueTokenPaths(value)) tokenPaths.add(t);
  }
}

const tokens = {};
const unresolved = [];
for (const dotPath of [...tokenPaths].sort()) {
  const cssVar = dotPathToCssVar(dotPath);
  const value = resolve(cssVar, base);
  if (value === undefined) {
    unresolved.push(`${dotPath} (${cssVar})`);
    continue;
  }
  const contexts = {};
  for (const [context, vars] of Object.entries(overrides)) {
    const contextValue = resolve(cssVar, { ...base, ...vars });
    if (contextValue !== value) contexts[context] = contextValue;
  }
  tokens[dotPath] = { cssVar, value, ...(Object.keys(contexts).length && { contexts }), figma: figmaVariable(dotPath) };
}

if (unresolved.length) {
  console.error(`✗ ${unresolved.length} token path(s) in spec styles do not resolve in the built CSS:`);
  for (const t of unresolved) console.error(`    ${t}`);
  process.exit(1);
}

const bundle = {
  $comment: "Generated by scripts/spec-bundle.js (npm run spec:bundle) — do not edit or commit (ADR-030).",
  defaultContext: { brand: DEFAULT_BRAND, theme: "light", device: "desktop" },
  figmaVariablesCapturedAt: mirror.capturedAt,
  components,
  tokens,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(bundle, null, 2) + "\n");
const withoutFigma = Object.values(tokens).filter((t) => !t.figma).length;
console.log(`✓ ${rel(OUT)}: ${names.length} components, ${Object.keys(tokens).length} tokens (${withoutFigma} with no Figma variable).`);
