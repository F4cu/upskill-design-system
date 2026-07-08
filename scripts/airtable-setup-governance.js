#!/usr/bin/env node
// One-time setup: adds governance fields to Primitive tokens and Semantic tokens tables.
// Safe to re-run — skips fields that already exist.

import "./load-env.js";
import { AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAMES } from "./airtable-ids.js";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

const TARGET_TABLE_NAMES = [AIRTABLE_TABLE_NAMES.primitives, AIRTABLE_TABLE_NAMES.semantic];

const GOVERNANCE_FIELDS = [
  {
    name: "Status",
    type: "singleSelect",
    options: { choices: [{ name: "active" }, { name: "deprecated" }] },
  },
  { name: "Owner", type: "singleLineText" },
  { name: "Successor", type: "singleLineText" },
  { name: "Notes", type: "multilineText" },
];

function metaTablesUrl() {
  return `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
}

function metaFieldsUrl(tableId) {
  return `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${tableId}/fields`;
}

function headers() {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

function validateEnv() {
  if (!AIRTABLE_API_KEY) throw new Error("Missing env var: AIRTABLE_API_KEY");
}

// Returns [{ id, name, existingFieldNames }] for each target table.
async function resolveTargetTables() {
  const res = await fetch(metaTablesUrl(), { headers: headers() });
  if (!res.ok) throw new Error(`Failed to list tables: ${res.status} ${await res.text()}`);
  const { tables } = await res.json();

  const targets = [];
  for (const name of TARGET_TABLE_NAMES) {
    const table = tables.find((t) => t.name === name);
    if (!table) throw new Error(`Table "${name}" not found in base. Check the base ID or table name.`);
    targets.push({ id: table.id, name, existingFieldNames: new Set(table.fields.map((f) => f.name)) });
  }
  return targets;
}

async function createField(tableId, tableName, field) {
  const body = { name: field.name, type: field.type };
  if (field.options) body.options = field.options;
  const res = await fetch(metaFieldsUrl(tableId), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create "${field.name}" in "${tableName}": ${res.status} ${await res.text()}`);
}

async function main() {
  validateEnv();

  const targets = await resolveTargetTables();

  for (const { id, name, existingFieldNames } of targets) {
    console.log(`\n"${name}":`);
    for (const field of GOVERNANCE_FIELDS) {
      if (existingFieldNames.has(field.name)) {
        console.log(`  ${field.name} — already exists, skipping`);
        continue;
      }
      await createField(id, name, field);
      console.log(`  ${field.name} — created`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
