#!/usr/bin/env node
// Pulls governance state from Airtable → packages/tokens/governance.json.
// Only records with a Status set are included; absent = treated as active by consumers.
// Run before any deprecation work until the Phase 6 Action automates this.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID ?? "appBfY2arkReKQNit";
const OUTPUT_PATH = path.resolve(__dirname, "../packages/tokens/governance.json");

const TABLES = {
  primitives: { name: "Primitive tokens", keyField: "Primitives" },
  semantic:   { name: "Semantic tokens",  keyField: "Token name" },
};

const GOV_FIELDS = ["Status", "Owner", "Successor", "Notes"];

function tableUrl(tableName) {
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
}

function headers() {
  return { Authorization: `Bearer ${AIRTABLE_API_KEY}` };
}

function validateEnv() {
  if (!AIRTABLE_API_KEY) throw new Error("Missing env var: AIRTABLE_API_KEY");
}

async function pullGovernance(tableName, keyField) {
  const records = {};
  let offset;

  do {
    const url = new URL(tableUrl(tableName));
    for (const f of [keyField, ...GOV_FIELDS]) url.searchParams.append("fields[]", f);
    url.searchParams.set("filterByFormula", "NOT({Status} = '')");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), { headers: headers() });
    if (!res.ok) throw new Error(`Airtable list failed on "${tableName}": ${res.status} ${await res.text()}`);
    const data = await res.json();

    for (const record of data.records ?? []) {
      const key = record.fields[keyField];
      if (!key) continue;
      records[key] = {
        status:    record.fields["Status"]    ?? null,
        owner:     record.fields["Owner"]     ?? null,
        successor: record.fields["Successor"] ?? null,
        notes:     record.fields["Notes"]     ?? null,
      };
    }
    offset = data.offset;
  } while (offset);

  return records;
}

async function main() {
  validateEnv();

  const governance = {};
  let total = 0;

  for (const [section, { name, keyField }] of Object.entries(TABLES)) {
    console.log(`Pulling "${name}"…`);
    governance[section] = await pullGovernance(name, keyField);
    const count = Object.keys(governance[section]).length;
    console.log(`  ${count} records with governance data`);
    total += count;
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(governance, null, 2) + "\n");
  console.log(`\nWrote governance.json (${total} total records).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
