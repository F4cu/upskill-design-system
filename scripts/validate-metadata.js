#!/usr/bin/env node
// Validates every component metadata file against component.schema.json.
// Also checks each metadata file's component.name matches its folder name,
// resolves tokens.* and composition.parts cross-references, checks tokens.*
// against what the component's own CSS Module and TSX read, validates the
// canonical example file, and checks every <Name>.spec.json parses. Exits
// non-zero on any failure so it can gate CI. This is the contract the
// component-scaffold and layout-generation agentic moments consume — keep it
// green.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv/dist/2020.js";
import { publicComponents, tokenSourceTree, tokenPathsByCssVar, componentTokenReads, tokenCategory } from "./lib.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.resolve(ROOT, "packages/components/src/components");
const SCHEMA_PATH = path.resolve(ROOT, "packages/components/component.schema.json");
const EXAMPLE_PATH = path.resolve(ROOT, "packages/components/component.metadata.example.json");

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const tokenTree = tokenSourceTree();
const tokenPathByCssVar = tokenPathsByCssVar(tokenTree);

function tokenExists(dotPath) {
  let node = tokenTree;
  for (const segment of dotPath.split(".")) {
    if (node && typeof node === "object" && segment in node) node = node[segment];
    else return false;
  }
  return node != null && typeof node === "object" && "$value" in node;
}

// Error messages carry the fix so a scaffold retry takes one turn (ADR-029 Step 5).
const DERIVE_HINT = (dir) => `run \`npm run metadata:derive-tokens -- ${dir}\` to rewrite tokens.* from the component's own reads`;

function schemaError(e) {
  const at = e.instancePath || "/";
  if (e.keyword === "enum") return `${at} must be one of: ${e.params.allowedValues.map((v) => JSON.stringify(v)).join(", ")}`;
  if (e.keyword === "minProperties" && at === "/variants") {
    return `${at} must have at least one axis — model a binary state as an axis, e.g. { "checked": { "options": [false, true], "default": false, "purpose": "…" } } (Chip)`;
  }
  if (e.keyword === "additionalProperties") return `${at} has unknown property "${e.params.additionalProperty}"`;
  return `${at} ${e.message}`;
}

const COMPONENT_NAMES = publicComponents();

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
  const { cssVars, tsxVars, tsxPrefixes } = componentTokenReads(path.join(COMPONENTS_DIR, dir));
  const listed = new Set();
  const errors = [];
  for (const [category, refs] of Object.entries(data.tokens ?? {})) {
    for (const ref of refs) {
      const cssVar = `--ds-${ref.replaceAll(".", "-")}`;
      listed.add(cssVar);
      if (!cssVars.has(cssVar) && !tsxVars.has(cssVar) && !tsxPrefixes.some((p) => cssVar.startsWith(p))) {
        errors.push(
          `tokens.${category}: "${ref}" is not read by ${dir}.module.css or index.tsx — a token a child component applies (Text color, Icon size, Stack gap) belongs to that child's metadata; ${DERIVE_HINT(dir)}`,
        );
      }
    }
  }
  for (const cssVar of cssVars) {
    if (!listed.has(cssVar)) {
      const dotPath = tokenPathByCssVar.get(cssVar);
      errors.push(`tokens: ${dir}.module.css reads ${cssVar}, which tokens.* does not list${dotPath ? ` — add "${dotPath}" to tokens.${tokenCategory(dotPath)}` : ""}`);
    }
  }
  return errors;
}

const targets = [];
for (const dir of fs.readdirSync(COMPONENTS_DIR)) {
  const file = path.join(COMPONENTS_DIR, dir, `${dir}.metadata.json`);
  const stray = !fs.existsSync(file) && !fs.existsSync(path.join(COMPONENTS_DIR, dir, "index.tsx"));
  targets.push({ file, expectedName: dir, stray });
}
targets.push({ file: EXAMPLE_PATH, expectedName: null });

let failures = 0;
for (const { file, expectedName, stray } of targets) {
  const rel = path.relative(ROOT, file);
  if (stray) {
    console.error(`✗ ${path.relative(ROOT, path.dirname(file))}/ — not a component (no index.tsx, no metadata); stray directory, likely a mkdir from the wrong cwd — remove it`);
    failures++;
    continue;
  }
  if (!fs.existsSync(file)) {
    console.error(`✗ ${rel} — missing metadata file`);
    failures++;
    continue;
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const errors = [];

  if (!validate(data)) {
    for (const e of validate.errors) {
      errors.push(schemaError(e));
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
          const real = tokenPathByCssVar.get(`--ds-${ref.replaceAll(".", "-")}`);
          errors.push(`tokens.${category} references unknown token "${ref}"${real ? ` — did you mean "${real}"? (DTCG dot-path, not the CSS variable spelling)` : ""}`);
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

// Specs (ADR-027) get their full check from spec:validate, which needs built
// tokens; parsing here keeps a broken spec from passing the token-free gate.
for (const { expectedName } of targets) {
  if (!expectedName) continue;
  const file = path.join(COMPONENTS_DIR, expectedName, `${expectedName}.spec.json`);
  if (!fs.existsSync(file)) continue;
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`✗ ${path.relative(ROOT, file)} — not valid JSON: ${e.message}`);
    failures++;
  }
}

if (failures) {
  console.error(`\n${failures} file(s) failed validation.`);
  process.exit(1);
}
console.log(`\n✓ All ${targets.length} metadata files valid.`);
