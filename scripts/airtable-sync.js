#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID ?? "appBfY2arkReKQNit";

const PRIMITIVES_TABLE = "Primitive tokens";
const SEMANTIC_TABLE = "Semantic tokens";
const DEVICE_TABLE = "Device tokens";

const PATHS = {
  primitives: path.resolve(__dirname, "../packages/tokens/src/primitives.json"),
  light: path.resolve(__dirname, "../packages/tokens/src/theme/light.json"),
  dark: path.resolve(__dirname, "../packages/tokens/src/theme/dark.json"),
  desktop: path.resolve(__dirname, "../packages/tokens/src/device/desktop.json"),
  tablet: path.resolve(__dirname, "../packages/tokens/src/device/tablet.json"),
  mobile: path.resolve(__dirname, "../packages/tokens/src/device/mobile.json"),
};

const PRIMITIVE_FIELDS = {
  path: "Primitives",
  value: "Value",
  group: "Group",
};

const SEMANTIC_FIELDS = {
  tokenName: "Token name",
  lightValueName: "Light theme alias",
  lightValue: "Light theme value",
  darkValueName: "Dark theme alias",
  darkValue: "Dark theme value",
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
  const allKeys = new Set([
    ...Object.keys(lightNode ?? {}),
    ...Object.keys(darkNode ?? {}),
  ]);

  for (const key of allKeys) {
    const tokenPath = prefix ? `${prefix}.${key}` : key;
    const lightVal = lightNode?.[key];
    const darkVal  = darkNode?.[key];
    const either   = lightVal ?? darkVal;

    if (either?.$type && (lightVal?.$value !== undefined || darkVal?.$value !== undefined)) {
      const lightAlias = lightVal?.$value ?? "";
      const darkAlias  = darkVal?.$value  ?? "";
      records.push({
        tokenName:      tokenPath,
        lightValueName: String(lightAlias),
        lightValue:     lightAlias ? resolveAlias(String(lightAlias), lightTree, primitives) : "",
        darkValueName:  String(darkAlias),
        darkValue:      darkAlias  ? resolveAlias(String(darkAlias),  darkTree,  primitives) : "",
        usage:     tokenPath.split(".")[0],
        component: tokenPath.split(".")[1] ?? "",
      });
    } else if (typeof either === "object" && either !== null) {
      records.push(...flattenSemantic(
        lightVal ?? {}, darkVal ?? {},
        primitives, lightTree, darkTree, tokenPath
      ));
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

// --- Device tokens ---

function cleanDevice(tokens) {
  const cleaned = { ...tokens };
  if (cleaned.font) {
    const { weight: _w, ...rest } = cleaned.font;
    cleaned.font = rest;
  }
  return cleaned;
}

function flattenDevice(node, prefix = "") {
  const records = [];
  for (const [key, val] of Object.entries(node)) {
    const tokenPath = prefix ? `${prefix}.${key}` : key;
    if (val.$type && val.$value !== undefined) {
      records.push({ path: tokenPath, alias: String(val.$value) });
    } else if (typeof val === "object" && val !== null) {
      records.push(...flattenDevice(val, tokenPath));
    }
  }
  return records;
}

function buildDeviceMap(tokens) {
  return Object.fromEntries(
    flattenDevice(tokens).map((r) => [r.path, r.alias])
  );
}

// --- Orphan detection and removal ---

async function listAllRecords(tableName, keyField) {
  const records = [];
  let offset;
  do {
    const url = new URL(tableUrl(tableName));
    url.searchParams.set("fields[]", keyField);
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: airtableHeaders() });
    if (!res.ok) return records;
    const data = await res.json();
    for (const r of data.records ?? []) {
      records.push({ id: r.id, key: r.fields[keyField] ?? "" });
    }
    offset = data.offset;
  } while (offset);
  return records;
}

async function deleteOrphans(tableName, keyField, currentKeys) {
  const existing = await listAllRecords(tableName, keyField);
  const currentSet = new Set(currentKeys);
  const orphans = existing.filter((r) => !currentSet.has(r.key));
  if (orphans.length === 0) {
    console.log(`  No orphans in "${tableName}".`);
    return;
  }
  console.log(`  Deleting ${orphans.length} orphan(s) from "${tableName}":`);
  for (const r of orphans) console.log(`    - ${r.key}`);

  const BATCH = 10;
  for (let i = 0; i < orphans.length; i += BATCH) {
    const ids = orphans.slice(i, i + BATCH).map((r) => r.id);
    const url = new URL(tableUrl(tableName));
    for (const id of ids) url.searchParams.append("records[]", id);
    const res = await fetch(url, { method: "DELETE", headers: airtableHeaders() });
    if (!res.ok) throw new Error(`Airtable delete failed: ${res.status} ${await res.text()}`);
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
  await deleteOrphans(PRIMITIVES_TABLE, PRIMITIVE_FIELDS.path, flat.map((r) => r.path));
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
  await deleteOrphans(SEMANTIC_TABLE, SEMANTIC_FIELDS.tokenName, records.map((r) => r.tokenName));
  console.log("Done.");
}

async function pushDevice() {
  console.log("Pushing device tokens → Airtable…");
  const primitives = JSON.parse(fs.readFileSync(PATHS.primitives, "utf8"));
  const desktop = buildDeviceMap(cleanDevice(JSON.parse(fs.readFileSync(PATHS.desktop, "utf8"))));
  const tablet  = buildDeviceMap(cleanDevice(JSON.parse(fs.readFileSync(PATHS.tablet, "utf8"))));
  const mobile  = buildDeviceMap(cleanDevice(JSON.parse(fs.readFileSync(PATHS.mobile, "utf8"))));

  // Union all three maps so tablet/mobile-only tokens are included.
  const allPaths = new Set([...Object.keys(desktop), ...Object.keys(tablet), ...Object.keys(mobile)]);

  const records = Array.from(allPaths).map((tokenPath) => {
    const desktopAlias = desktop[tokenPath] ?? tablet[tokenPath] ?? mobile[tokenPath];
    const tabletAlias  = tablet[tokenPath]  ?? desktopAlias;
    const mobileAlias  = mobile[tokenPath]  ?? desktopAlias;
    return {
      token: tokenPath,
      group: tokenPath.split(".")[0],
      desktopAlias,
      desktopValue: resolveAlias(desktopAlias, {}, primitives),
      tabletAlias,
      tabletValue: resolveAlias(tabletAlias, {}, primitives),
      mobileAlias,
      mobileValue: resolveAlias(mobileAlias, {}, primitives),
    };
  });

  console.log(`  ${records.length} device tokens found`);
  await upsertRecords(DEVICE_TABLE, "Token", records, (r) => ({
    "Token":          r.token,
    "Group":          r.group,
    "Desktop alias":  r.desktopAlias,
    "Desktop value":  r.desktopValue,
    "Tablet alias":   r.tabletAlias,
    "Tablet value":   r.tabletValue,
    "Mobile alias":   r.mobileAlias,
    "Mobile value":   r.mobileValue,
  }));
  await deleteOrphans(DEVICE_TABLE, "Token", records.map((r) => r.token));
  console.log("Done.");
}

// --- Entry point ---

const COMMANDS = {
  "push:primitives": pushPrimitives,
  "push:semantic": pushSemantic,
  "push:device": pushDevice,
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
