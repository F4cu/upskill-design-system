#!/usr/bin/env node
// Validates every <Name>.usage.json against component.usage.schema.json
// (ADR-001 amendment 2026-11-10). Also checks that component.name matches the
// folder, that notFor.instead names a component, that composition.limits name
// real variant options, that pattern names are unique across the set, resolves composition.parts cross-references, validates
// the canonical example file, and checks every <Name>.spec.json parses. Exits
// non-zero on any failure so it can gate CI. This is the contract the
// component-scaffold and layout-generation agentic moments consume — keep it
// green.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv/dist/2020.js";
import { publicComponents } from "./lib.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.resolve(ROOT, "packages/components/src/components");
const SCHEMA_PATH = path.resolve(ROOT, "packages/components/component.usage.schema.json");
const EXAMPLE_PATH = path.resolve(ROOT, "packages/components/component.usage.example.json");

const SPEC_SECTIONS = ["states", "tokens", "accessibility"];
const RENAMED = {
  usage: "its fields moved to the top level (useWhen, notFor) and composition (patterns, donts, limits)",
  patterns: "moved to composition.patterns as { name, useWhen }",
};
const RENAMED_IN_COMPOSITION = {
  rules: "renamed to composition.donts, with do renamed to instead",
};

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

function schemaError(e) {
  const at = e.instancePath || "/";
  if (e.keyword === "enum") return `${at} must be one of: ${e.params.allowedValues.map((v) => JSON.stringify(v)).join(", ")}`;
  if (e.keyword === "minProperties" && at === "/variants") {
    return `${at} must have at least one axis — model a binary state as an axis, e.g. { "checked": { "options": [false, true], "default": false, "useWhen": { … } } } (Chip)`;
  }
  if (e.keyword === "additionalProperties") {
    const prop = e.params.additionalProperty;
    if (at === "/" && SPEC_SECTIONS.includes(prop)) {
      return `/ has unknown property "${prop}" — states, tokens and accessibility live in <Name>.spec.json (ADR-001 amendment 2026-10-11)`;
    }
    if (at === "/" && RENAMED[prop]) {
      return `/ has unknown property "${prop}" — ${RENAMED[prop]} (ADR-001 amendment 2026-11-10)`;
    }
    if (at === "/composition" && RENAMED_IN_COMPOSITION[prop]) {
      return `/composition has unknown property "${prop}" — ${RENAMED_IN_COMPOSITION[prop]} (ADR-001 amendment 2026-11-10)`;
    }
    return `${at} has unknown property "${prop}"`;
  }
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

// notFor.instead must name a component; null is allowed when the alternative
// is outside the library, and then a note has to say what it is.
function checkNotFor(data) {
  const errors = [];
  (data.notFor ?? []).forEach((n, i) => {
    if (n.instead === null && !n.note) {
      errors.push(`notFor[${i}]: instead is null, so note must say what to use`);
    } else if (n.instead !== null && !COMPONENT_NAMES.has(n.instead)) {
      errors.push(`notFor[${i}].instead: "${n.instead}" is not a component`);
    }
    if (n.instead === data.component?.name) {
      errors.push(`notFor[${i}].instead: points at the component itself`);
    }
  });
  return errors;
}

// composition.limits[].if must name a variant axis and one of its options.
function checkLimits(data) {
  const errors = [];
  (data.composition?.limits ?? []).forEach((l, i) => {
    for (const [axis, option] of Object.entries(l.if)) {
      const v = data.variants?.[axis];
      if (!v) errors.push(`composition.limits[${i}].if: "${axis}" is not a variant axis`);
      else if (!v.options.includes(option)) errors.push(`composition.limits[${i}].if.${axis}: "${option}" is not an option`);
    }
  });
  return errors;
}

// Pattern names are ids shared with the story export, the Figma example frame
// and spec.anatomyExamples, so they must be unique across the whole set.
const patternOwners = new Map();
function checkPatterns(data, rel) {
  const errors = [];
  for (const p of data.composition?.patterns ?? []) {
    const owner = patternOwners.get(p.name);
    if (owner && owner !== rel) errors.push(`composition.patterns: "${p.name}" is already a pattern of ${owner}`);
    else if (owner) errors.push(`composition.patterns: duplicate name "${p.name}"`);
    patternOwners.set(p.name, rel);
  }
  return errors;
}

// variants.<axis>.useWhen keys must be options of that axis.
function checkVariantUseWhen(data) {
  const errors = [];
  for (const [axis, v] of Object.entries(data.variants ?? {})) {
    for (const key of Object.keys(v.useWhen ?? {})) {
      if (!v.options.map(String).includes(key)) errors.push(`variants.${axis}.useWhen: "${key}" is not an option`);
    }
  }
  return errors;
}

const targets = [];
for (const dir of fs.readdirSync(COMPONENTS_DIR)) {
  const file = path.join(COMPONENTS_DIR, dir, `${dir}.usage.json`);
  const stray = !fs.existsSync(file) && !fs.existsSync(path.join(COMPONENTS_DIR, dir, "index.tsx"));
  const legacy = path.join(COMPONENTS_DIR, dir, `${dir}.metadata.json`);
  targets.push({ file, expectedName: dir, stray, legacy: fs.existsSync(legacy) ? legacy : null });
}
targets.push({ file: EXAMPLE_PATH, expectedName: null });

let failures = 0;
for (const { file, expectedName, stray, legacy } of targets) {
  const rel = path.relative(ROOT, file);
  if (stray) {
    console.error(`✗ ${path.relative(ROOT, path.dirname(file))}/ — not a component (no index.tsx, no usage file); stray directory, likely a mkdir from the wrong cwd — remove it`);
    failures++;
    continue;
  }
  if (legacy) {
    console.error(`✗ ${path.relative(ROOT, legacy)} — renamed to <Name>.usage.json (ADR-001 amendment 2026-11-10)`);
    failures++;
    continue;
  }
  if (!fs.existsSync(file)) {
    console.error(`✗ ${rel} — missing usage file`);
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

  if (data.composition?.parts) errors.push(...checkParts(data.composition.parts));
  errors.push(...checkNotFor(data), ...checkLimits(data), ...checkVariantUseWhen(data));
  if (expectedName) errors.push(...checkPatterns(data, rel));

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
console.log(`\n✓ All ${targets.length} usage files valid.`);
