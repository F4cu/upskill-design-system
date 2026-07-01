#!/usr/bin/env node
// Validates every component metadata file against component.schema.json.
// Also checks each metadata file's component.name matches its folder name, and
// validates the canonical example file. Exits non-zero on any failure so it can
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
const TOKEN_FILES = [
  "primitives.json",
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
