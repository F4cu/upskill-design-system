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

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

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
