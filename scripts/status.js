#!/usr/bin/env node
// Read-only terminal views over the committed frozen-memory files — plain
// Node, no AI, no live API calls. A dumb renderer: stage logic lives in
// sense.js and is read back from component-pipeline.json, never re-derived.
//
//   npm run status                    dashboard — component/token totals,
//                                     latest token changes (from git history)
//   npm run status:board              per-component review table
//   npm run status:component <Name>   one component's checklist card

import path from "path";
import { execFileSync } from "child_process";
import { readJson, ROOT, flattenDTCG, usagesFor } from "./lib.js";

const PIPELINE_PATH = path.resolve(ROOT, ".claude/component-pipeline.json");
const GOVERNANCE_PATH = path.resolve(ROOT, "packages/tokens/airtable-governance.json");
const USAGE_PATH = path.resolve(ROOT, "packages/tokens/token-usage.json");
const TOKENS_SRC = "packages/tokens/src";

const tty = process.stdout.isTTY;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = paint("32");
const yellow = paint("33");
const cyan = paint("36");
const dim = paint("2");
const bold = paint("1");
const gray = paint("90");

const visLen = (s) => s.replace(/\x1b\[[0-9;]*m/g, "").length;
const padEnd = (s, w) => s + " ".repeat(Math.max(0, w - visLen(s)));

// left-hand key column inside boxes: `type        interactive`
const kv = (k, v) => `${cyan(padEnd(k, 11))} ${v}`;

// lines: strings, or { rule: "section title" } for an inner divider
function box(title, lines) {
  const w = Math.max(
    visLen(title) + 4,
    ...lines.map((l) => (typeof l === "string" ? visLen(l) : visLen(l.rule) + 4)),
  );
  const out = [
    gray("┌─ ") + bold(cyan(title)) + gray(` ${"─".repeat(w - visLen(title) - 1)}┐`),
  ];
  for (const l of lines) {
    if (typeof l === "string") {
      out.push(`${gray("│")} ${padEnd(l, w)} ${gray("│")}`);
    } else {
      out.push(gray("├─ ") + cyan(l.rule) + gray(` ${"─".repeat(w - visLen(l.rule) - 1)}┤`));
    }
  }
  out.push(gray(`└${"─".repeat(w + 2)}┘`));
  return out.join("\n");
}

function checklistLines(c) {
  return c.checklist.map((item) => {
    if (item.na) return `${dim("n/a")} ${dim(`${item.label} — ${item.na}`)}`;
    const mark = item.done ? green("[x]") : yellow("[ ]");
    return `${mark} ${item.label}${item.note ? ` — ${item.note}` : ""}`;
  });
}

function components() {
  return readJson(PIPELINE_PATH).components;
}

function cmdComponent(name) {
  const all = components();
  const c = all.find((x) => x.name.toLowerCase() === (name ?? "").toLowerCase());
  if (!c) {
    console.error(name ? `Unknown component: ${name}` : "Usage: npm run status:component <Name>");
    console.error(`Known: ${all.map((x) => x.name).join(", ")}`);
    process.exit(1);
  }

  const lines = [
    kv("type", c.type),
    kv("maturity", c.maturity),
    kv("stage", `${c.implementation}${c.substate ? ` · ${c.substate}` : ""}${c.reviewPath ? ` · path: ${c.reviewPath}` : ""}`),
  ];
  if (c.reviewedAt) lines.push(kv("reviewed", c.reviewedAt.slice(0, 10)));

  if (c.checklist) {
    lines.push({ rule: "review checklist" }, ...checklistLines(c));
    if (c.checklist.every((i) => i.na || i.done)) {
      lines.push({ rule: "next" }, "all items done — promote to `done` in Airtable (Implementation column)");
    } else if (!c.checklist[1].done) {
      lines.push({ rule: "next" }, "visual review pending — record it via /add-component's checkpoint or /review-component");
    }
  } else if (c.implementation === "in progress") {
    lines.push(
      { rule: "next" },
      c.substate === "unreviewed"
        ? `never entered the loop — /review-component ${c.name} (adversarial) or /code-review (in-session)`
        : "scaffold underway — a .run.json is open with no render checkpoint yet",
    );
  }

  console.log(box(c.name, lines));
}

const STAGE_ORDER = ["done", "in review", "in progress", "todo"];
const mark = (item) => (item.na ? dim("–") : item.done ? green("✓") : dim("○"));

function cmdBoard() {
  const all = components().sort(
    (a, b) =>
      STAGE_ORDER.indexOf(a.implementation) - STAGE_ORDER.indexOf(b.implementation) ||
      a.name.localeCompare(b.name),
  );

  const rows = all.map((c) => [
    c.name,
    c.type,
    c.implementation + (c.substate ? ` (${c.substate})` : ""),
    c.reviewPath ?? "–",
    ...(c.checklist ? c.checklist.slice(1).map(mark) : [dim("–"), dim("–"), dim("–")]),
  ]);
  const head = ["COMPONENT", "TYPE", "STAGE", "PATH", "VIS", "CODE", "LEARN"];
  const widths = head.map((h, i) => Math.max(visLen(h), ...rows.map((r) => visLen(r[i]))));

  const counts = STAGE_ORDER.map(
    (s) => `${all.filter((c) => c.implementation === s).length} ${s}`,
  ).join(" · ");
  console.log(`${bold(`${all.length} components`)} — ${counts}`);
  console.log(dim("gate passed for every reviewed row; VIS/CODE/LEARN: ✓ done · ○ pending · – n/a\n"));
  console.log(cyan(head.map((h, i) => padEnd(h, widths[i])).join("  ")));
  for (const r of rows) console.log(r.map((cell, i) => padEnd(cell, widths[i])).join("  "));
}

function flattenAt(rev, file) {
  let raw;
  try {
    raw = execFileSync("git", ["show", `${rev}:${file}`], { cwd: ROOT, encoding: "utf8" });
  } catch {
    return null;
  }
  const map = {};
  try {
    flattenDTCG(JSON.parse(raw), (p, v) => {
      map[p] = JSON.stringify(v.$value);
      return null;
    });
  } catch {
    return null;
  }
  return map;
}

// Newest-first token adds/edits/removals, replayed from git history of the
// committed source (the frozen files carry no per-token timestamps).
function latestTokenChanges(limit, maxCommits = 50) {
  const git = (...args) =>
    execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  const log = git("log", `-n${maxCommits}`, "--format=%H %ad", "--date=short", "--", TOKENS_SRC);
  const changes = [];
  const seen = new Set();
  const record = (kind, token, layer, date) => {
    const key = `${layer}:${token}`;
    if (seen.has(key)) return;
    seen.add(key);
    changes.push({ kind, token, layer, date });
  };

  for (const line of log ? log.split("\n") : []) {
    const [sha, date] = line.split(" ");
    const files = git("diff-tree", "--no-commit-id", "--name-only", "-r", sha, "--", TOKENS_SRC)
      .split("\n")
      .filter((f) => f.endsWith(".json") && !f.endsWith("$metadata.json"));
    for (const f of files) {
      const layer = f.slice(TOKENS_SRC.length + 1).replace(/\.json$/, "");
      const after = flattenAt(sha, f) ?? {};
      const before = flattenAt(`${sha}^`, f) ?? {};
      for (const [tok, val] of Object.entries(after)) {
        if (!(tok in before)) record("+", tok, layer, date);
        else if (before[tok] !== val) record("~", tok, layer, date);
      }
      for (const tok of Object.keys(before)) {
        if (!(tok in after)) record("−", tok, layer, date);
      }
    }
    if (changes.length >= limit) break;
  }
  return changes.slice(0, limit);
}

function cmdDashboard() {
  const all = components();
  const byImpl = STAGE_ORDER.map(
    (s) => `${s} ${all.filter((c) => c.implementation === s).length}`,
  ).join(" · ");
  const byType = {};
  const byMaturity = {};
  for (const c of all) {
    byType[c.type] = (byType[c.type] ?? 0) + 1;
    byMaturity[c.maturity] = (byMaturity[c.maturity] ?? 0) + 1;
  }
  const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ");

  console.log(
    box(`components — ${all.length}`, [
      kv("stage", byImpl),
      kv("maturity", fmt(byMaturity)),
      kv("type", fmt(byType)),
    ]),
  );

  const layers = { primitives: 0, brands: 0, theme: 0, device: 0 };
  let total = 0;
  for (const f of execFileSync("git", ["ls-files", "--", `${TOKENS_SRC}/*.json`], { cwd: ROOT, encoding: "utf8" })
    .trim()
    .split("\n")) {
    if (f.endsWith("$metadata.json")) continue;
    const n = flattenDTCG(readJson(path.resolve(ROOT, f)), () => 1).length;
    const top = f.slice(TOKENS_SRC.length + 1).split("/")[0].replace(".json", "");
    layers[top === "primitives" ? "primitives" : top] += n;
    total += n;
  }

  const governance = readJson(GOVERNANCE_PATH);
  const usage = readJson(USAGE_PATH);
  const governed = [];
  let deprecatedInUse = 0;
  for (const [section, records] of Object.entries(governance)) {
    if (section.startsWith("$")) continue;
    const entries = Object.entries(records);
    const dep = entries.filter(([, r]) => r.status === "deprecated");
    governed.push(`${section} ${entries.length} (${dep.length} deprecated)`);
    deprecatedInUse += dep.filter(([tok]) => usagesFor(tok, usage).length > 0).length;
  }

  console.log(
    box(`tokens — ${total}`, [
      kv("layers", Object.entries(layers).map(([k, n]) => `${k} ${n}`).join(" · ")),
      kv("governed", governed.join(" · ")),
      kv(
        "in use",
        `${Object.keys(usage.css ?? {}).length} css vars · ${Object.keys(usage.aliases ?? {}).length} {alias} refs` +
          (deprecatedInUse ? ` · ${yellow(`${deprecatedInUse} deprecated still referenced`)}` : ""),
      ),
    ]),
  );

  const changes = latestTokenChanges(5);
  const w = Math.max(0, ...changes.map((c) => c.token.length));
  console.log(
    box(
      "latest token changes",
      changes.length
        ? changes.map(
            (c) =>
              `${c.kind === "+" ? green("+") : c.kind === "−" ? yellow("−") : "~"} ${padEnd(c.token, w)}  ${padEnd(c.layer, 14)}  ${dim(c.date)}`,
          )
        : ["no committed changes found"],
    ),
  );
  console.log(dim("legend: + added · ~ modified · − removed (newest first, from git history)"));
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "component") cmdComponent(arg);
else if (cmd === "board") cmdBoard();
else if (!cmd) cmdDashboard();
else {
  console.error(`Unknown subcommand: ${cmd}. Use: status | status board | status component <Name>`);
  process.exit(1);
}
