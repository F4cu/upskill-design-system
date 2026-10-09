// Shared helpers for the committed node scripts (sense.js, sense-component.js,
// airtable-sync.js, airtable-pull.js, token-usage.js). Small and deliberately
// narrow — flattenSemantic in airtable-sync.js is genuinely different (light +
// dark trees resolved together) and stays out of this abstraction. See issue #34.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

// The component set every validator agrees on (issue #98): the PascalCase
// value exports of the components package, i.e. what a layout can import.
// Includes exported sub-components (AccordionItem); excludes hooks and types.
export function publicComponents() {
  const index = fs.readFileSync(path.join(ROOT, "packages/components/src/index.ts"), "utf8");
  const names = [...index.matchAll(/^export \{([^}]+)\} from/gm)].flatMap((m) => m[1].split(",").map((n) => n.trim()));
  return new Set(names.filter((n) => /^[A-Z]/.test(n)));
}

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function rel(absPath) {
  return path.relative(ROOT, absPath);
}

// Interactivity derivation (ADR-008), shared by the Tier-2 a11y gate
// (a11y-coverage.js) and /add-component's risk-triggered reviewer (ADR-029,
// via component-risk.js) so both agree on what counts as interactive.
//
// Whole-word interactive ARIA roles. Matched with word boundaries so a prose
// role like "menu or listbox (controlled via listRole prop)" still resolves.
const INTERACTIVE_ROLES = [
  "button", "link", "checkbox", "radio", "switch", "tab", "menuitem",
  "menuitemcheckbox", "menuitemradio", "combobox", "listbox", "option",
  "slider", "textbox", "spinbutton",
];

// A keyboard interaction signals a custom widget contract only if it goes
// beyond plain focus traversal (Tab/Shift+Tab) or native browser behavior.
function hasWidgetKeyboard(keyboardInteractions) {
  return (keyboardInteractions || []).some((k) => {
    const action = (k.action || "").toLowerCase();
    if (action.includes("native browser")) return false;
    const keyTokens = (k.key || "")
      .toLowerCase()
      .replace(/shift/g, "")
      .split(/[+/\s]+/)
      .filter(Boolean);
    return keyTokens.some((t) => t !== "tab");
  });
}

export function isInteractive(meta) {
  const type = meta.component?.type;
  if (type === "interactive" || type === "input") return true;

  const a11y = meta.accessibility || {};
  const role = (a11y.role || "").toLowerCase();
  if (INTERACTIVE_ROLES.some((r) => new RegExp(`\\b${r}\\b`).test(role))) return true;

  return hasWidgetKeyboard(a11y.keyboardInteractions);
}

// Review paths: `full` (adversarial subagent) or `standard` (in-session
// /code-review). Legacy artifact values are normalized on read; see sense.js.
const LEGACY_REVIEW_PATHS = { adversarial: "full", "in-session": "standard", lighter: "standard" };
export const normalizeReviewPath = (p) => LEGACY_REVIEW_PATHS[p] ?? p ?? "full";

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
