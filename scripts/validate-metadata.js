#!/usr/bin/env node
// Validates every component metadata file against component.schema.json.
// Also checks each metadata file's component.name matches its folder name,
// resolves tokens.* and composition.parts cross-references, checks tokens.*
// against what the component's own CSS Module and TSX read, and validates the
// canonical example file. Exits non-zero on any failure so it can
// gate CI. This is the contract the component-scaffold and layout-generation
// agentic moments consume — keep it green.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv/dist/2020.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.resolve(ROOT, "packages/components/src/components");
const SCHEMA_PATH = path.resolve(ROOT, "packages/components/component.schema.json");
const EXAMPLE_PATH = path.resolve(ROOT, "packages/components/component.metadata.example.json");
const TOKENS_SRC = path.resolve(ROOT, "packages/tokens/src");

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

// Merge every source token file into one tree so metadata dot-paths can be
// resolved against the tokens they claim to use. A node is a token when it
// carries a $value; the metadata ref must land on one.
// The brand layer holds the color slot ramps (color.brand/accent/neutral/surface)
// and font.family.* — metadata may reference those, and every brand shares an
// identical shape (build-time shape gate), so merging all brands is safe.
const TOKEN_FILES = [
  "primitives.json",
  ...fs
    .readdirSync(path.join(TOKENS_SRC, "brands"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => `brands/${f}`),
  "theme/light.json",
  "theme/dark.json",
  "device/desktop.json",
  "device/tablet.json",
  "device/mobile.json",
];

function mergeTokens(target, source) {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value) && !("$value" in value)) {
      target[key] ??= {};
      mergeTokens(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

const tokenTree = TOKEN_FILES.reduce(
  (tree, rel) => mergeTokens(tree, JSON.parse(fs.readFileSync(path.join(TOKENS_SRC, rel), "utf8"))),
  {},
);

function tokenExists(dotPath) {
  let node = tokenTree;
  for (const segment of dotPath.split(".")) {
    if (node && typeof node === "object" && segment in node) node = node[segment];
    else return false;
  }
  return node != null && typeof node === "object" && "$value" in node;
}

const COMPONENT_NAMES = new Set(
  fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name),
);

// composition.parts cross-references (ADR-023). Part names must not collide
// with component folders so an `accepts` entry resolves to exactly one thing.
function checkParts(parts) {
  const errors = [];
  const names = parts.map((p) => p.name);
  const partNames = new Set(names);
  for (const dup of names.filter((n, i) => names.indexOf(n) !== i)) {
    errors.push(`composition.parts: duplicate part name "${dup}"`);
  }
  for (const part of parts) {
    const at = `composition.parts["${part.name}"]`;
    if (COMPONENT_NAMES.has(part.name)) {
      errors.push(`${at}: name collides with component "${part.name}"`);
    }
    if (part.builtOn != null && !COMPONENT_NAMES.has(part.builtOn)) {
      errors.push(`${at}.builtOn: "${part.builtOn}" is not a component`);
    }
    if (part.kind === "fixed" && part.accepts) {
      errors.push(`${at}.accepts: not allowed on a fixed part`);
    }
    if ((part.kind === "slot" || part.kind === "open") && !part.accepts?.length) {
      errors.push(`${at}.accepts: required on a ${part.kind} part`);
    }
    for (const ref of part.accepts ?? []) {
      if (!COMPONENT_NAMES.has(ref) && !partNames.has(ref)) {
        errors.push(`${at}.accepts: "${ref}" is neither a component nor a sibling part`);
      }
    }
    for (const ref of part.containedBy ?? []) {
      if (!partNames.has(ref)) {
        errors.push(`${at}.containedBy: "${ref}" is not a sibling part`);
      }
    }
  }
  return errors;
}

// tokens.* lists exactly the tokens the component itself reads: var(--ds-*) in
// its CSS Module or TSX, including a TSX template prefix such as
// `var(--ds-size-avatar-${size})`. Tokens a child component applies (a Text
// color, a Stack gap) belong to that child's metadata (ADR-001 amendment).
function checkTokenReads(dir, data) {
  const read = (file, re) => (fs.existsSync(file) ? [...fs.readFileSync(file, "utf8").matchAll(re)].map((m) => m[1]) : []);
  const cssVars = new Set(read(path.join(COMPONENTS_DIR, dir, `${dir}.module.css`), /var\((--ds-[a-z0-9-]+)/g));
  const tsxFile = path.join(COMPONENTS_DIR, dir, "index.tsx");
  const tsxVars = new Set(read(tsxFile, /(--ds-[a-z0-9-]+)(?!-?\$\{)/g));
  const tsxPrefixes = read(tsxFile, /(--ds-[a-z0-9-]*-)\$\{/g);
  const listed = new Set();
  const errors = [];
  for (const [category, refs] of Object.entries(data.tokens ?? {})) {
    for (const ref of refs) {
      const cssVar = `--ds-${ref.replaceAll(".", "-")}`;
      listed.add(cssVar);
      if (!cssVars.has(cssVar) && !tsxVars.has(cssVar) && !tsxPrefixes.some((p) => cssVar.startsWith(p))) {
        errors.push(`tokens.${category}: "${ref}" is not read by ${dir}.module.css or index.tsx`);
      }
    }
  }
  for (const cssVar of cssVars) {
    if (!listed.has(cssVar)) errors.push(`tokens: ${dir}.module.css reads ${cssVar}, which tokens.* does not list`);
  }
  return errors;
}

const targets = [];
for (const dir of fs.readdirSync(COMPONENTS_DIR)) {
  const file = path.join(COMPONENTS_DIR, dir, `${dir}.metadata.json`);
  targets.push({ file, expectedName: dir });
}
targets.push({ file: EXAMPLE_PATH, expectedName: null });

let failures = 0;
for (const { file, expectedName } of targets) {
  const rel = path.relative(ROOT, file);
  if (!fs.existsSync(file)) {
    console.error(`✗ ${rel} — missing metadata file`);
    failures++;
    continue;
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const errors = [];

  if (!validate(data)) {
    for (const e of validate.errors) {
      errors.push(`${e.instancePath || "/"} ${e.message}`);
    }
  }

  if (expectedName && data.component?.name !== expectedName) {
    errors.push(`component.name "${data.component?.name}" does not match folder "${expectedName}"`);
  }

  // The example file uses illustrative token paths that need not resolve; only
  // real components must reference tokens that exist in the source tree.
  if (expectedName && data.tokens) {
    for (const [category, refs] of Object.entries(data.tokens)) {
      for (const ref of Array.isArray(refs) ? refs : [refs]) {
        if (typeof ref === "string" && !tokenExists(ref)) {
          errors.push(`tokens.${category} references unknown token "${ref}"`);
        }
      }
    }
  }

  if (expectedName) errors.push(...checkTokenReads(expectedName, data));

  if (data.composition?.parts) errors.push(...checkParts(data.composition.parts));

  if (errors.length) {
    console.error(`✗ ${rel}`);
    for (const msg of errors) console.error(`    ${msg}`);
    failures++;
  } else {
    console.log(`✓ ${rel}`);
  }
}

if (failures) {
  console.error(`\n${failures} metadata file(s) failed validation.`);
  process.exit(1);
}
console.log(`\n✓ All ${targets.length} metadata files valid.`);
