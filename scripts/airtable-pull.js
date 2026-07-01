#!/usr/bin/env node
// Pulls governance state from Airtable → packages/tokens/airtable-governance.json.
// Only records with a Status set are included; absent = treated as active by consumers.
// Run before any deprecation work until the Phase 6 Action automates this.

import "./load-env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID ?? "appBfY2arkReKQNit";
const OUTPUT_PATH = path.resolve(__dirname, "../packages/tokens/airtable-governance.json");
const GOVERNANCE_COMMENT =
  "Frozen mirror of the Airtable governance layer (status/owner/successor/notes per token). " +
  "Pulled via scripts/airtable-pull.js (npm run airtable:pull:governance) — never hand-edited, " +
  "never read live via the Airtable MCP. Keys starting with '$' are metadata, not governed sections.";
const SIGNOFF_PATH = path.resolve(__dirname, "../.claude/component-signoff.json");

const TABLES = {
  primitives: { name: "Primitive tokens", keyField: "Primitives" },
  semantic:   { name: "Semantic tokens",  keyField: "Token name" },
};

const GOV_FIELDS = ["Status", "Owner", "Successor", "Notes"];

const COMPONENTS_TABLE = "Components";
// Human-owned Implementation values are the only ones pulled back: `done` (the
// sign-off) and `todo` (a planned/backlog component). The loop stages
// (in progress / in review) are derived by sense.js, not pulled — pulling them
// would be circular.
const HUMAN_OWNED_IMPL = new Set(["done", "todo"]);

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

// Pull the human-owned component lifecycle sign-off (Implementation = done/todo).
// Loop-derived stages are ignored so the value never round-trips through code.
async function pullComponentSignoff() {
  const signoff = {};
  let offset;

  do {
    const url = new URL(tableUrl(COMPONENTS_TABLE));
    url.searchParams.append("fields[]", "Name");
    url.searchParams.append("fields[]", "Implementation");
    url.searchParams.set("filterByFormula", "NOT({Implementation} = '')");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), { headers: headers() });
    if (!res.ok) throw new Error(`Airtable list failed on "${COMPONENTS_TABLE}": ${res.status} ${await res.text()}`);
    const data = await res.json();

    for (const record of data.records ?? []) {
      const name = record.fields["Name"];
      const impl = record.fields["Implementation"];
      if (name && HUMAN_OWNED_IMPL.has(impl)) signoff[name] = impl;
    }
    offset = data.offset;
  } while (offset);

  return signoff;
}

async function main() {
  validateEnv();

  const governance = { $comment: GOVERNANCE_COMMENT };
  let total = 0;

  for (const [section, { name, keyField }] of Object.entries(TABLES)) {
    console.log(`Pulling "${name}"…`);
    governance[section] = await pullGovernance(name, keyField);
    const count = Object.keys(governance[section]).length;
    console.log(`  ${count} records with governance data`);
    total += count;
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(governance, null, 2) + "\n");
  console.log(`\nWrote airtable-governance.json (${total} total records).`);

  console.log(`Pulling "${COMPONENTS_TABLE}" sign-off…`);
  const signoff = await pullComponentSignoff();
  fs.writeFileSync(SIGNOFF_PATH, JSON.stringify(signoff, null, 2) + "\n");
  console.log(`  ${Object.keys(signoff).length} component(s) human-signed → wrote .claude/component-signoff.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
