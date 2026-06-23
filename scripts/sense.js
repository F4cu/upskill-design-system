#!/usr/bin/env node
// Pure aggregation (no AI, no live API calls): composes the three committed
// frozen-memory files into .claude/STATUS_QUO.md, the single readable baseline a
// loop agent reads instead of calling Airtable/Figma.
//
//   governance.json      — Airtable mirror   (scripts/airtable-pull.js)
//   token-usage.json     — repo usage scan   (scripts/token-usage.js)
//   figma-variables.json — Figma mirror      (/figma-variable-audit via MCP)
//
// figma-variables.json is captured interactively via the Figma MCP, not by a
// script — the Variables REST API is Enterprise-gated (ADR-002 amendment). It may
// be absent or stale; this script degrades gracefully and surfaces that state
// rather than failing. Representational divergences (unitless line-heights Figma
// can't store) are tagged/omitted at capture time, so no drift recompute happens
// here.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const GOVERNANCE_PATH  = path.resolve(ROOT, "packages/tokens/governance.json");
const USAGE_PATH       = path.resolve(ROOT, "packages/tokens/token-usage.json");
const FIGMA_PATH       = path.resolve(ROOT, "packages/tokens/figma-variables.json");
const COMPONENTS_DIR   = path.resolve(ROOT, "packages/components/src/components");
const OUTPUT_PATH      = path.resolve(ROOT, ".claude/STATUS_QUO.md");

const STALE_AFTER_DAYS = 30;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function rel(absPath) {
  return path.relative(ROOT, absPath);
}

// dot-path token → SD CSS custom property, e.g. color.terracotta.9 → --ds-color-terracotta-9
function dotPathToCssVar(dotPath) {
  return "--ds-" + dotPath.replace(/\./g, "-");
}

// Every file that references a token, across both usage maps.
function usagesFor(dotPath, usage) {
  const files = new Set();
  for (const f of usage.aliases?.[dotPath] ?? []) files.add(f);
  for (const f of usage.css?.[dotPathToCssVar(dotPath)] ?? []) files.add(f);
  return [...files];
}

function daysBetween(isoDate, now) {
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((now - then) / 86_400_000);
}

function governanceSection(governance, usage) {
  const lines = [];
  const deprecatedWithUsage = [];

  for (const [section, records] of Object.entries(governance)) {
    const entries = Object.entries(records);
    const active = entries.filter(([, r]) => r.status === "active").length;
    const deprecated = entries.filter(([, r]) => r.status === "deprecated");
    lines.push(
      `- **${section}** — ${entries.length} governed · ${active} active · ${deprecated.length} deprecated`,
    );
    for (const [token, r] of deprecated) {
      const files = usagesFor(token, usage);
      if (files.length > 0) {
        deprecatedWithUsage.push({ section, token, successor: r.successor, files });
      }
    }
  }

  const out = ["## Governance", "", ...lines, ""];

  out.push("### Deprecated tokens still in use — migration backlog", "");
  if (deprecatedWithUsage.length === 0) {
    out.push("None. No deprecated token has a live reference. ✅", "");
  } else {
    out.push("Each row is a `/token-deprecation-pass` candidate.", "");
    out.push("| Token | Successor | Referenced in |", "|---|---|---|");
    for (const { token, successor, files } of deprecatedWithUsage) {
      out.push(`| \`${token}\` | ${successor ? `\`${successor}\`` : "_none_"} | ${files.map((f) => `\`${f}\``).join(", ")} |`);
    }
    out.push("");
  }

  return out.join("\n");
}

function usageSection(usage) {
  const cssCount = Object.keys(usage.css ?? {}).length;
  const aliasCount = Object.keys(usage.aliases ?? {}).length;
  return [
    "## Token usage",
    "",
    `- **${cssCount}** distinct CSS custom properties referenced in \`packages/components/src\``,
    `- **${aliasCount}** distinct dot-path tokens referenced via \`{alias}\` syntax in theme/device JSON`,
    `- Full token→files maps: \`${rel(USAGE_PATH)}\``,
    "",
  ].join("\n");
}

function figmaSection(now) {
  const out = ["## Figma drift", ""];

  if (!fs.existsSync(FIGMA_PATH)) {
    out.push(
      "> ⚠️ No `figma-variables.json` committed yet. The Figma snapshot is captured",
      "> interactively via the Figma MCP during `/figma-variable-audit` (the Variables",
      "> REST API is Enterprise-gated — ADR-002 amendment), so it cannot be regenerated",
      "> by this script. **Figma drift is unknown** until the snapshot is captured.",
      "",
    );
    return out.join("\n");
  }

  const figma = readJson(FIGMA_PATH);
  const summary = figma.summary ?? {};
  const total = Object.values(summary).reduce((a, n) => a + n, 0);
  const capturedAt = figma.capturedAt ?? null;
  const age = capturedAt ? daysBetween(capturedAt, now) : null;
  const divergences = figma.representationalDivergences?.variables ?? [];

  out.push(`- Snapshot captured: **${capturedAt ?? "unknown"}** (interactive Figma MCP — not script-regenerable, ADR-002)`);
  if (age !== null) {
    const staleNote = age > STALE_AFTER_DAYS ? ` ⚠️ stale (> ${STALE_AFTER_DAYS}d — recapture before relying on drift)` : "";
    out.push(`- Age: **${age} day(s)**${staleNote}`);
  }
  out.push(
    `- Variables mirrored: **${total}** (${Object.entries(summary).map(([c, n]) => `${c} ${n}`).join(" · ")})`,
    `- Excluded as **representational divergences** (unitless line-heights Figma stores as px — not drift): **${divergences.length}**`,
    "",
    "This is a frozen mirror, not a live drift comparison. Run `/figma-variable-audit` to diff it against committed tokens.",
    "",
  );

  return out.join("\n");
}

function componentSection() {
  if (!fs.existsSync(COMPONENTS_DIR)) {
    return ["## Components", "", "> ⚠️ No components directory found.", ""].join("\n");
  }

  const components = fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const p = path.join(COMPONENTS_DIR, d.name, `${d.name}.metadata.json`);
      if (!fs.existsSync(p)) return [];
      const meta = JSON.parse(fs.readFileSync(p, "utf8"));
      return [meta.component];
    });

  const byStatus = { beta: [], ready: [], deprecated: [] };
  const byType = {};
  for (const c of components) {
    (byStatus[c.status] ?? (byStatus[c.status] = [])).push(c.name);
    (byType[c.type] ?? (byType[c.type] = [])).push(c.name);
  }

  const statusLine = Object.entries(byStatus)
    .filter(([, names]) => names.length > 0)
    .map(([s, names]) => `${names.length} ${s}`)
    .join(" · ");

  const typeLine = Object.entries(byType)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, names]) => `${type} (${names.length})`)
    .join(" · ");

  const out = [
    "## Components",
    "",
    `- **${components.length} total** — ${statusLine}`,
    `- By type: ${typeLine}`,
    `- Source: \`packages/components/src/components/*/\*.metadata.json\``,
    "",
  ];

  if (byStatus.beta?.length) {
    out.push("### Beta (not production-ready)", "");
    for (const name of byStatus.beta) out.push(`- \`${name}\``);
    out.push("");
  }

  if (byStatus.deprecated?.length) {
    out.push("### Deprecated — migration needed", "");
    for (const name of byStatus.deprecated) out.push(`- \`${name}\``);
    out.push("");
  }

  return out.join("\n");
}

function main() {
  const now = new Date();
  const governance = readJson(GOVERNANCE_PATH);
  const usage = readJson(USAGE_PATH);

  const header = [
    "# Status quo",
    "",
    "> Generated by `npm run sense` — **do not edit by hand**. This is the single",
    "> readable baseline aggregating the committed frozen-memory files. Loop agents",
    "> read this instead of calling Airtable or Figma live.",
    "",
    `Generated: **${now.toISOString()}**`,
    "",
    "Sources:",
    `- \`${rel(GOVERNANCE_PATH)}\` (Airtable mirror)`,
    `- \`${rel(USAGE_PATH)}\` (repo usage scan)`,
    `- \`${rel(FIGMA_PATH)}\`${fs.existsSync(FIGMA_PATH) ? " (Figma mirror)" : " — not captured"}`,
    "",
    "---",
    "",
  ].join("\n");

  const body = [
    governanceSection(governance, usage),
    componentSection(),
    usageSection(usage),
    figmaSection(now),
  ].join("\n");

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, header + body.trimEnd() + "\n");

  console.log(`Wrote ${rel(OUTPUT_PATH)}`);
}

main();
