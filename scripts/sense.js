#!/usr/bin/env node
// Pure aggregation (no AI, no live API calls): composes the three committed
// frozen-memory files into .claude/STATUS_QUO.md, the single readable baseline a
// loop agent reads instead of calling Airtable/Figma.
//
//   airtable-governance.json — Airtable mirror (scripts/airtable-pull.js)
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
import { readJson, rel, usagesFor, daysBetween } from "./lib.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const GOVERNANCE_PATH  = path.resolve(ROOT, "packages/tokens/airtable-governance.json");
const USAGE_PATH       = path.resolve(ROOT, "packages/tokens/token-usage.json");
const FIGMA_PATH       = path.resolve(ROOT, "packages/tokens/figma-variables.json");
const COMPONENTS_DIR   = path.resolve(ROOT, "packages/components/src/components");
const HANDOFF_DIR      = path.resolve(ROOT, ".claude/handoff/runs");
const OUTPUT_PATH      = path.resolve(ROOT, ".claude/STATUS_QUO.md");
const PIPELINE_PATH    = path.resolve(ROOT, ".claude/component-pipeline.json");
const SIGNOFF_PATH     = path.resolve(ROOT, ".claude/component-signoff.json");

// Human-owned implementation values, set in Airtable and pulled via
// airtable-pull.js. They win over the artifact-derived stage:
//   done — the visual-check sign-off code can't know.
//   todo — a planned/backlog component the maintainer is queuing.
// The active stages (in progress / in review) are code-derived, never here.
const HUMAN_OWNED_IMPL = new Set(["done", "todo"]);

const STALE_AFTER_DAYS = 30;

// Write only when the content changed apart from its embedded timestamp. The
// timestamp records when the system state last changed, not when sense last ran,
// so re-running with no real change must leave the file (and its timestamp)
// untouched — otherwise every run churns git with a timestamp-only diff.
// `normalize` blanks the timestamp so two outputs that differ only there compare
// equal. Returns true if the file was (re)written.
function writeIfChanged(filePath, content, normalize) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (existing !== null && normalize(existing) === normalize(content)) {
    return false;
  }
  fs.writeFileSync(filePath, content);
  return true;
}

function governanceSection(governance, usage) {
  const lines = [];
  const deprecatedWithUsage = [];

  for (const [section, records] of Object.entries(governance)) {
    if (section.startsWith("$")) continue;
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

function handoffArtifact(name, ext) {
  const p = path.join(HANDOFF_DIR, `${name}.${ext}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {}; // present but malformed — still counts as existing
  }
}

// Implementation stage = where a component sits in the add-component →
// review-component → extract-learnings loop, derived purely from its committed
// handoff artifacts (never a live call):
//
//   in review   — loop fully closed. Two ways to get here:
//                 (a) full path: adversarial review ran AND learnings were
//                     back-filled, or
//                 (b) lighter path (`.review.json` with `"path": "lighter"`):
//                     the CLAUDE.md "light in-session review, no subagent"
//                     option — `/code-review` + the gate, findings fixed
//                     inline in the same pass. There is no separate
//                     extract-learnings step for this path, so a `.review.json`
//                     alone closes the loop; it never needs a `.learnings.json`.
//                 Either way, everything an agent/script can verify is green;
//                 awaiting the human visual check + `done` sign-off.
//   in progress — loop started but not closed: a *full-path* review ran but
//                 `/extract-learnings` hasn't back-filled its findings yet
//                 (the common case), or — rarer, and generally a tooling gap
//                 worth investigating — a `.run.json` was logged with no
//                 matching `.review.json` at all.
//   null        — pre-loop ("established"): never entered the formal loop.
//                 A lone snapshot is just a context cache and does not count.
//
// `done`/`todo` are human-owned and authored in Airtable, pulled into
// component-signoff.json by airtable-pull.js. They are layered on here and win
// over the artifact-derived stage; the loop stages are never derived from them.
function readSignoff() {
  if (!fs.existsSync(SIGNOFF_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SIGNOFF_PATH, "utf8"));
  } catch {
    return {};
  }
}

function deriveImplementation(name, signoff) {
  const human = signoff[name];
  if (HUMAN_OWNED_IMPL.has(human)) return human;
  const review = handoffArtifact(name, "review");
  const learnings = handoffArtifact(name, "learnings");
  const run = handoffArtifact(name, "run");
  if (review?.path === "lighter") return "in review";
  if (review && learnings) return "in review";
  if (review || run) return "in progress";
  return "established"; // pre-loop: predates the add-component loop, no artifacts
}

function buildComponentPipeline() {
  if (!fs.existsSync(COMPONENTS_DIR)) return [];
  const signoff = readSignoff();
  return fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const p = path.join(COMPONENTS_DIR, d.name, `${d.name}.metadata.json`);
      if (!fs.existsSync(p)) return [];
      const c = JSON.parse(fs.readFileSync(p, "utf8")).component;
      const review = handoffArtifact(c.name, "review");
      return [{
        name: c.name,
        type: c.type,
        maturity: c.status,
        implementation: deriveImplementation(c.name, signoff),
        signedOff: HUMAN_OWNED_IMPL.has(signoff[c.name]),
        reviewedAt: review?.reviewedAt ?? null,
        reviewPath: review?.path ?? "full",
        learningsBackfilled: handoffArtifact(c.name, "learnings") !== null,
      }];
    });
}

function componentSection(pipeline) {
  if (pipeline.length === 0) {
    return ["## Components", "", "> ⚠️ No components directory found.", ""].join("\n");
  }

  const byStatus = {};
  const byType = {};
  const byImpl = { done: [], "in review": [], "in progress": [], todo: [], established: [] };

  for (const c of pipeline) {
    (byStatus[c.maturity] ?? (byStatus[c.maturity] = [])).push(c.name);
    (byType[c.type] ?? (byType[c.type] = [])).push(c.name);
    byImpl[c.implementation].push(c);
  }

  const maturityOrder = ["beta", "ready", "deprecated"];
  const statusLine = Object.entries(byStatus)
    .sort(([a], [b]) => maturityOrder.indexOf(a) - maturityOrder.indexOf(b))
    .map(([s, names]) => `${names.length} ${s}`)
    .join(" · ");

  const typeLine = Object.entries(byType)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, names]) => `${type} (${names.length})`)
    .join(" · ");

  const implLine = [
    `${byImpl.done.length} done`,
    `${byImpl["in review"].length} in review`,
    `${byImpl["in progress"].length} in progress`,
    `${byImpl.todo.length} todo`,
    `${byImpl.established.length} established (pre-loop)`,
  ].join(" · ");

  const out = [
    "## Components",
    "",
    `- **${pipeline.length} total** — Maturity: ${statusLine}`,
    `- By type: ${typeLine}`,
    `- Implementation: ${implLine}`,
    `- Source: \`packages/components/src/components/*/\*.metadata.json\` + \`.claude/handoff/runs/\` + \`.claude/component-signoff.json\` (human \`done\`/\`todo\` from Airtable)`,
    "",
  ];

  if (byImpl.done.length) {
    out.push("### Done — human signed off", "");
    for (const c of byImpl.done) out.push(`- \`${c.name}\` — maturity \`${c.maturity}\``);
    out.push("");
  }

  if (byImpl["in review"].length) {
    out.push(
      "### In review — awaiting human sign-off",
      "",
      "Gate, adversarial review, and learnings back-fill all green. Promote to `done`",
      "in Airtable (Implementation column) after the visual check in Storybook.",
      "",
    );
    for (const c of byImpl["in review"]) {
      const when = c.reviewedAt ? `reviewed ${c.reviewedAt.slice(0, 10)}` : "review date unknown";
      const via = c.reviewPath === "lighter" ? "lighter-path review (no learnings step needed)" : "learnings back-filled";
      out.push(`- \`${c.name}\` — maturity \`${c.maturity}\` · ${when} · ${via}`);
    }
    out.push("");
  }

  if (byImpl["in progress"].length) {
    out.push(
      "### In progress — review done, learnings not yet back-filled",
      "",
      "A full-path adversarial review (`/review-component`) ran and closed, but",
      "`/extract-learnings` hasn't routed its findings into metadata yet — that's",
      "the near-universal case here. The rarer case is a `.run.json` logged with",
      "no matching `.review.json` at all, which usually signals a tooling gap",
      "worth investigating rather than a normal in-flight review.",
      "",
    );
    for (const c of byImpl["in progress"]) {
      const pending = c.learningsBackfilled ? "" : " · `/extract-learnings` pending";
      out.push(`- \`${c.name}\` — maturity \`${c.maturity}\`${pending}`);
    }
    out.push("");
  }

  if (byImpl.todo.length) {
    out.push(
      "### Todo — planned / backlog (human-set in Airtable)",
      "",
    );
    for (const c of byImpl.todo) out.push(`- \`${c.name}\` — maturity \`${c.maturity}\``);
    out.push("");
  }

  if (byImpl.established.length) {
    out.push(
      "### Established — review backlog",
      "",
      "Stable, documented components that predate the loop and were never put",
      "through an adversarial review. Not active work — candidates to harden with",
      "`/review-component <Name>` when there's time. Running one moves the",
      "component into the loop automatically.",
      "",
      byImpl.established.map((c) => `\`${c.name}\``).join(" · "),
      "",
    );
  }

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

function pendingLearningsSection() {
  if (!fs.existsSync(HANDOFF_DIR)) {
    return ["## Pending extract-learnings", "", "None. No handoff directory found.", ""].join("\n");
  }

  const pending = fs
    .readdirSync(HANDOFF_DIR)
    .filter((f) => f.endsWith(".review.json"))
    .filter((f) => {
      const name = f.replace(".review.json", "");
      return !fs.existsSync(path.join(HANDOFF_DIR, `${name}.learnings.json`));
    })
    .map((f) => {
      const name = f.replace(".review.json", "");
      let reviewedAt = null;
      try {
        const review = JSON.parse(fs.readFileSync(path.join(HANDOFF_DIR, f), "utf8"));
        reviewedAt = review.reviewedAt ?? null;
      } catch {
        // malformed file — still surface it
      }
      return { name, reviewedAt };
    });

  const out = ["## Pending extract-learnings", ""];

  if (pending.length === 0) {
    out.push("None. All review findings have been back-filled. ✅", "");
  } else {
    out.push(
      `**${pending.length}** component(s) reviewed but learnings not yet back-filled into metadata.`,
      "Run `/extract-learnings --all` to process all at once, or `/extract-learnings <Name>` individually.",
      "",
    );
    for (const { name, reviewedAt } of pending) {
      const when = reviewedAt ? `reviewed ${reviewedAt.slice(0, 10)}` : "review date unknown";
      out.push(`- \`${name}\` — ${when} → \`/extract-learnings ${name}\``);
    }
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

  const pipeline = buildComponentPipeline();

  const body = [
    governanceSection(governance, usage),
    componentSection(pipeline),
    pendingLearningsSection(),
    usageSection(usage),
    figmaSection(now),
  ].join("\n");

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const statusQuo = header + body.trimEnd() + "\n";
  const pipelineJson =
    JSON.stringify({ generatedAt: now.toISOString(), components: pipeline }, null, 2) + "\n";

  // Blank every wall-clock-derived line so the rewrite decision tracks captured
  // state, not the clock: the run timestamp and the Figma snapshot Age (computed
  // from now vs capturedAt) both change without any real change. When something
  // real does change, the file is rewritten and these refresh to current.
  const normalizeMd = (s) =>
    s
      .replace(/^Generated: \*\*.*\*\*$/m, "Generated: **TS**")
      .replace(/^- Age: \*\*.*$/m, "- Age: **TS**");
  const normalizeJson = (s) => s.replace(/"generatedAt": ".*"/, '"generatedAt": "TS"');

  const wroteStatusQuo = writeIfChanged(OUTPUT_PATH, statusQuo, normalizeMd);
  const wrotePipeline = writeIfChanged(PIPELINE_PATH, pipelineJson, normalizeJson);

  console.log(`${wroteStatusQuo ? "Wrote" : "Unchanged"} ${rel(OUTPUT_PATH)}`);
  console.log(`${wrotePipeline ? "Wrote" : "Unchanged"} ${rel(PIPELINE_PATH)}`);
}

main();
