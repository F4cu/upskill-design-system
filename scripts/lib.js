// Shared helpers for the committed node scripts (sense.js, sense-component.js,
// airtable-sync.js, airtable-pull.js, token-usage.js). Small and deliberately
// narrow — flattenSemantic in airtable-sync.js is genuinely different (light +
// dark trees resolved together) and stays out of this abstraction. See issue #34.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function rel(absPath) {
  return path.relative(ROOT, absPath);
}

// dot-path token → SD CSS custom property, e.g. color.terracotta.9 → --ds-color-terracotta-9
export function dotPathToCssVar(dotPath) {
  return "--ds-" + dotPath.replace(/\./g, "-");
}

// Every file that references a token, across both usage maps (CSS var() refs
// and {alias} refs in theme/device JSON).
export function usagesFor(dotPath, usage) {
  const files = new Set();
  for (const f of usage.aliases?.[dotPath] ?? []) files.add(f);
  for (const f of usage.css?.[dotPathToCssVar(dotPath)] ?? []) files.add(f);
  return [...files];
}

export function daysBetween(isoDate, now) {
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((now - then) / 86_400_000);
}

// Generic DTCG tree walk: recurses until a `{ $type, $value }` leaf is found,
// then hands it to `onLeaf(tokenPath, node)` to shape the record. Shared by
// flattenPrimitives and flattenDevice in airtable-sync.js, which differ only in
// what they extract from the leaf.
export function flattenDTCG(node, onLeaf, prefix = "") {
  const records = [];
  for (const [key, val] of Object.entries(node)) {
    const tokenPath = prefix ? `${prefix}.${key}` : key;
    if (val.$type && val.$value !== undefined) {
      records.push(onLeaf(tokenPath, val));
    } else if (typeof val === "object" && val !== null) {
      records.push(...flattenDTCG(val, onLeaf, tokenPath));
    }
  }
  return records;
}

// Paginates an Airtable list endpoint (offset-based), handing each page's raw
// records to `onPage`. `onError` controls what happens on a non-OK response:
// "throw" (default) raises, "stop" silently returns what was collected so far.
export async function airtableListAllPages(url, headers, { fields = [], filterByFormula, onError = "throw", onPage }) {
  let offset;
  do {
    const pageUrl = new URL(url);
    for (const f of fields) pageUrl.searchParams.append("fields[]", f);
    if (filterByFormula) pageUrl.searchParams.set("filterByFormula", filterByFormula);
    if (offset) pageUrl.searchParams.set("offset", offset);

    const res = await fetch(pageUrl, { headers });
    if (!res.ok) {
      if (onError === "throw") {
        throw new Error(`Airtable list failed: ${res.status} ${await res.text()}`);
      }
      return;
    }
    const data = await res.json();
    onPage(data.records ?? []);
    offset = data.offset;
  } while (offset);
}
