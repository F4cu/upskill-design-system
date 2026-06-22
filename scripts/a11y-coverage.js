#!/usr/bin/env node
// Tier-2 a11y completeness gate (ADR-008). Reads every component's metadata,
// derives which components are *interactive* (and so owe a behavioral
// `<Name>.a11y.test.tsx`), and fails if any interactive component lacks one.
// Non-interactive components (Badge, Divider, Text, landmarks) are never
// required to have one — the gate is complexity-scoped on purpose.
//
// A shrinking backlog (scripts/a11y-backlog.json) waives pre-existing
// interactive components not yet backfilled, so turning the gate on doesn't
// redden `main`. New interactive components cannot be added to the backlog by
// convention — they must ship with a test. Backfill removes entries until the
// file is empty, then it (and this waiver branch) can go.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.resolve(ROOT, "packages/components/src/components");
const BACKLOG_PATH = path.resolve(__dirname, "a11y-backlog.json");

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

function isInteractive(meta) {
  const type = meta.component?.type;
  if (type === "interactive" || type === "input") return true;

  const a11y = meta.accessibility || {};
  const role = (a11y.role || "").toLowerCase();
  if (INTERACTIVE_ROLES.some((r) => new RegExp(`\\b${r}\\b`).test(role))) return true;

  return hasWidgetKeyboard(a11y.keyboardInteractions);
}

const backlog = fs.existsSync(BACKLOG_PATH)
  ? JSON.parse(fs.readFileSync(BACKLOG_PATH, "utf8"))
  : [];

const interactive = [];
for (const dir of fs.readdirSync(COMPONENTS_DIR)) {
  const metaFile = path.join(COMPONENTS_DIR, dir, `${dir}.metadata.json`);
  if (!fs.existsSync(metaFile)) continue;
  const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  if (!isInteractive(meta)) continue;

  const hasTest = fs.existsSync(path.join(COMPONENTS_DIR, dir, `${dir}.a11y.test.tsx`));
  interactive.push({ name: dir, hasTest });
}

const errors = [];
const waived = [];

for (const { name, hasTest } of interactive) {
  if (hasTest) continue;
  if (backlog.includes(name)) {
    waived.push(name);
    continue;
  }
  errors.push(`✗ ${name} — interactive component is missing ${name}/${name}.a11y.test.tsx`);
}

// Keep the ledger honest: a backlog entry that is now covered, no longer
// interactive, or no longer a component is stale and must be removed.
const interactiveNames = new Set(interactive.map((c) => c.name));
const covered = new Set(interactive.filter((c) => c.hasTest).map((c) => c.name));
for (const name of backlog) {
  if (covered.has(name)) {
    errors.push(`✗ ${name} — backfilled; remove it from scripts/a11y-backlog.json`);
  } else if (!interactiveNames.has(name)) {
    errors.push(`✗ ${name} — listed in a11y-backlog.json but is not an interactive component; remove it`);
  }
}

const covEntries = interactive.filter((c) => c.hasTest).map((c) => c.name);
console.log(`a11y coverage: ${covEntries.length}/${interactive.length} interactive components covered.`);
if (covEntries.length) console.log(`  covered: ${covEntries.join(", ")}`);
if (waived.length) console.log(`  backlog (waived, backfill these): ${waived.join(", ")}`);

if (errors.length) {
  console.error("");
  for (const e of errors) console.error(e);
  console.error(`\n${errors.length} a11y coverage problem(s).`);
  process.exit(1);
}
console.log("\n✓ Every interactive component has a behavioral a11y test (or a tracked backlog waiver).");
