#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID ?? "appBfY2arkReKQNit";

const PRIMITIVES_TABLE = "Primitive tokens";
const SEMANTIC_TABLE = "Semantic tokens";

const PATHS = {
  primitives: path.resolve(__dirname, "../packages/tokens/src/primitives.json"),
  light: path.resolve(__dirname, "../packages/tokens/src/theme/light.json"),
  dark: path.resolve(__dirname, "../packages/tokens/src/theme/dark.json"),
};

const PRIMITIVE_FIELDS = {
  path: "Primitives",
  value: "Value",
  group: "Group",
};

const SEMANTIC_FIELDS = {
  tokenName: "Token name",
  lightValueName: "Light value name",
  lightValue: "Light value",
  darkValueName: "Dark value name",
  darkValue: "Dark value",
};

function validateEnv() {
  if (!AIRTABLE_API_KEY) throw new Error("Missing env var: AIRTABLE_API_KEY");
}

function tableUrl(tableName) {
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
}

function airtableHeaders() {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// --- Shared utilities ---

function getByPath(dotPath, obj) {
  return dotPath.split(".").reduce((node, key) => node?.[key], obj);
}

// Follow {alias.path} chains across a theme file and primitives until a raw value is reached.
function resolveAlias(alias, themeTokens, primitiveTokens, depth = 0) {
  if (depth > 10 || typeof alias !== "string") return alias;
  if (!alias.startsWith("{") || !alias.endsWith("}")) return alias;
  const refPath = alias.slice(1, -1);
  const node = getByPath(refPath, themeTokens) ?? getByPath(refPath, primitiveTokens);
  if (!node) return alias;
  const val = node.$value ?? node;
  if (typeof val === "string" && val.startsWith("{")) {
    return resolveAlias(val, themeTokens, primitiveTokens, depth + 1);
  }
  return String(val);
}

// --- Primitive tokens ---

function flattenPrimitives(node, prefix = "") {
  const records = [];
  for (const [key, val] of Object.entries(node)) {
    const tokenPath = prefix ? `${prefix}.${key}` : key;
    if (val.$type && val.$value !== undefined) {
      records.push({
        path: tokenPath,
        value: String(val.$value),
        group: tokenPath.split(".")[0],
      });
    } else if (typeof val === "object" && val !== null) {
      records.push(...flattenPrimitives(val, tokenPath));
    }
  }
  return records;
}

// --- Semantic tokens ---

function flattenSemantic(lightNode, darkNode, primitives, lightTree, darkTree, prefix = "") {
  const records = [];
  for (const [key, lightVal] of Object.entries(lightNode)) {
    const tokenPath = prefix ? `${prefix}.${key}` : key;
    const darkVal = darkNode?.[key];

    if (key === "$root") continue;
    if (lightVal.$type && lightVal.$value !== undefined) {
      const lightAlias = lightVal.$value;
      const darkAlias = darkVal?.$value ?? "";
      const stripBraces = (s) => s.replace(/^\{|\}$/g, "");
      records.push({
        tokenName: tokenPath,
        lightValueName: stripBraces(lightAlias),
        lightValue: resolveAlias(lightAlias, lightTree, primitives),
        darkValueName: stripBraces(darkAlias),
        darkValue: darkAlias ? resolveAlias(darkAlias, darkTree, primitives) : "",
        usage: tokenPath.split(".")[0],
        component: tokenPath.split(".")[1] ?? "",
      });
    } else if (typeof lightVal === "object" && lightVal !== null) {
      records.push(...flattenSemantic(lightVal, darkVal, primitives, lightTree, darkTree, tokenPath));
    }
  }
  return records;
}

// --- Airtable upsert ---

async function upsertRecords(tableName, mergeField, records, toFields) {
  const BATCH = 10;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const body = {
      performUpsert: { fieldsToMergeOn: [mergeField] },
      typecast: true,
      records: batch.map((r) => ({ fields: toFields(r) })),
    };

    const res = await fetch(tableUrl(tableName), {
      method: "PATCH",
      headers: airtableHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Airtable upsert failed: ${res.status} ${await res.text()}`);

    console.log(`  Upserted ${Math.min(i + BATCH, records.length)}/${records.length}`);
  }
}

// --- Commands ---

async function pushPrimitives() {
  console.log("Pushing primitives → Airtable…");
  const tree = JSON.parse(fs.readFileSync(PATHS.primitives, "utf8"));
  const flat = flattenPrimitives(tree);
  console.log(`  ${flat.length} tokens found in primitives.json`);
  await upsertRecords(PRIMITIVES_TABLE, PRIMITIVE_FIELDS.path, flat, (r) => ({
    [PRIMITIVE_FIELDS.path]: r.path,
    [PRIMITIVE_FIELDS.value]: r.value,
    [PRIMITIVE_FIELDS.group]: r.group,
  }));
  console.log("Done.");
}

async function pushSemantic() {
  console.log("Pushing semantic tokens → Airtable…");
  const primitives = JSON.parse(fs.readFileSync(PATHS.primitives, "utf8"));
  const lightTree = JSON.parse(fs.readFileSync(PATHS.light, "utf8"));
  const darkTree = JSON.parse(fs.readFileSync(PATHS.dark, "utf8"));
  const records = flattenSemantic(lightTree, darkTree, primitives, lightTree, darkTree);
  console.log(`  ${records.length} semantic tokens found`);
  await upsertRecords(SEMANTIC_TABLE, SEMANTIC_FIELDS.tokenName, records, (r) => ({
    [SEMANTIC_FIELDS.tokenName]: r.tokenName,
    [SEMANTIC_FIELDS.lightValueName]: r.lightValueName,
    [SEMANTIC_FIELDS.lightValue]: r.lightValue,
    [SEMANTIC_FIELDS.darkValueName]: r.darkValueName,
    [SEMANTIC_FIELDS.darkValue]: r.darkValue,
    Usage: r.usage,
    Component: r.component,
  }));
  console.log("Done.");
}

// --- Entry point ---

const COMMANDS = {
  "push:primitives": pushPrimitives,
  "push:semantic": pushSemantic,
};

async function main() {
  const command = process.argv[2];
  // Keep bare "push" as an alias for push:primitives for backwards compat
  const fn = COMMANDS[command] ?? (command === "push" ? pushPrimitives : null);

  if (!fn) {
    console.error(`Usage: node scripts/airtable-sync.js <command>`);
    console.error(`Commands: ${["push", ...Object.keys(COMMANDS)].join(", ")}`);
    process.exit(1);
  }

  validateEnv();
  await fn();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
