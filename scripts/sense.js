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
const REVIEW_STATE_PATH = path.resolve(ROOT, ".claude/component-review-state.json");

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

// Implementation stage = one of four broad stages (issue #64, ADR-010
// amendment), derived purely from files (never a live call): the committed
// component-review-state.json baseline plus any local runs/ artifacts (see
// promoteReviewState). These four values are the only ones that ever reach
// the Airtable Implementation column:
//
//   todo        — human-owned (Airtable): planned / backlog.
//   in progress — code exists, review pipeline not begun. Sub-states:
//                 `unreviewed` (no artifacts at all — replaces the old
//                 `established`; a lone snapshot is just a context cache) or
//                 `scaffold-underway` (a `.run.json` open, no render
//                 checkpoint yet).
//   in review   — generation complete and renderable: the review checklist
//                 has begun (a review ran, or a visual review was recorded).
//                 Committable WIP; stays here until human sign-off, including
//                 while visual review or learnings back-fill are pending.
//                 Checklist detail is derived at render time (reviewChecklist).
//   done        — human-owned (Airtable): sign-off after the checklist.
//
// Review paths: `adversarial` (/review-component, fresh subagent + learnings
// loop) or `in-session` (/code-review on the diff — no subagent, no separate
// learnings step). Legacy artifact values `full`/`lighter` are normalized on
// read so old local runs/ artifacts can't reintroduce them.
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

// Review state must survive in a committed file: sense also runs in CI
// (sync.yml post-merge) on a checkout where the gitignored runs/ artifacts
// don't exist, yet the pipeline it derives is committed. Local artifacts are
// merged over the committed baseline (a local review wins; learningsBackfilled
// latches true) and written back, so CI reads the file as-is and can never
// regress a stage it has no artifacts for. See ADR-015 amendment.
const LEGACY_PATHS = { full: "adversarial", lighter: "in-session" };
const normalizePath = (p) => LEGACY_PATHS[p] ?? p ?? "adversarial";

function promoteReviewState() {
  const state = fs.existsSync(REVIEW_STATE_PATH)
    ? JSON.parse(fs.readFileSync(REVIEW_STATE_PATH, "utf8"))
    : {};
  for (const rec of Object.values(state)) {
    if (rec.path) rec.path = normalizePath(rec.path);
  }

  const names = new Set(
    (fs.existsSync(HANDOFF_DIR) ? fs.readdirSync(HANDOFF_DIR) : [])
      .map((f) => f.match(/^(.+)\.(review|learnings)\.json$/))
      .filter(Boolean)
      .map((m) => m[1]),
  );
  for (const name of names) {
    const review = handoffArtifact(name, "review");
    const learnings = handoffArtifact(name, "learnings") !== null;
    const prev = state[name] ?? {};
    state[name] = {
      reviewedAt: review?.reviewedAt ?? prev.reviewedAt ?? null,
      path: normalizePath(review ? review.path : prev.path),
      learningsBackfilled: learnings || prev.learningsBackfilled === true,
      ...(prev.visualReview ? { visualReview: prev.visualReview } : {}),
    };
  }

  const sorted = Object.fromEntries(
    Object.keys(state).sort().map((k) => [k, state[k]]),
  );
  writeIfChanged(REVIEW_STATE_PATH, JSON.stringify(sorted, null, 2) + "\n", (s) => s);
  return sorted;
}

function deriveImplementation(name, signoff, reviewState) {
  const human = signoff[name];
  if (HUMAN_OWNED_IMPL.has(human)) return { stage: human, substate: null };
  const rec = reviewState[name];
  if (rec?.reviewedAt || rec?.visualReview) return { stage: "in review", substate: null };
  const run = handoffArtifact(name, "run");
  if (rec || run) return { stage: "in progress", substate: "scaffold-underway" };
  return { stage: "in progress", substate: "unreviewed" };
}

// Tier-2 proxy for the checklist label: a11y-coverage.js derives interactivity
// from type ∈ {interactive, input} plus role/keyboard heuristics; type alone is
// enough to phrase the item — the coverage gate itself stays authoritative.
const TIER2_TYPES = new Set(["interactive", "input"]);

// Checklist under `in review`, derived at render time — no stored state beyond
// reviewPath / learningsBackfilled / visualReview (issue #64). Item 1 is one
// pass/fail item and is checked for anything in review: the CI gate runs the
// same scripts on every components PR, and the add-component loop fail-fasts
// before the render checkpoint. Non-required items render as explicit n/a.
function reviewChecklist(c) {
  const adversarial = c.reviewPath === "adversarial";
  const codeLabel = adversarial
    ? TIER2_TYPES.has(c.type)
      ? "Code and behavioural a11y review — adversarial subagent"
      : "Code review — adversarial subagent"
    : "Code review — in-session /code-review";
  const visual = c.visualReview;
  return [
    { label: "Automated gate — lint · typecheck · build · metadata · a11y scripts", done: true },
    {
      label: "Visual review — human y/n/other(comments)",
      done: visual?.status === "approved",
      note: visual?.status === "changes-requested"
        ? `changes requested${visual.comments ? ` — ${visual.comments}` : ""}`
        : null,
    },
    { label: codeLabel, done: Boolean(c.reviewedAt) },
    adversarial
      ? { label: "Learnings back-fill (/extract-learnings)", done: c.learningsBackfilled }
      : { label: "Learnings back-fill", na: "not required on in-session path" },
  ];
}

function buildComponentPipeline(reviewState) {
  if (!fs.existsSync(COMPONENTS_DIR)) return [];
  const signoff = readSignoff();
  return fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const p = path.join(COMPONENTS_DIR, d.name, `${d.name}.metadata.json`);
      if (!fs.existsSync(p)) return [];
      const c = JSON.parse(fs.readFileSync(p, "utf8")).component;
      const rec = reviewState[c.name];
      const { stage, substate } = deriveImplementation(c.name, signoff, reviewState);
      const entry = {
        name: c.name,
        type: c.type,
        maturity: c.status,
        implementation: stage,
        substate,
        signedOff: HUMAN_OWNED_IMPL.has(signoff[c.name]),
        reviewedAt: rec?.reviewedAt ?? null,
        reviewPath: rec?.path ?? null,
        learningsBackfilled: rec?.learningsBackfilled === true,
        visualReview: rec?.visualReview ?? null,
      };
      entry.checklist = stage === "in review" ? reviewChecklist(entry) : null;
      return [entry];
    });
}

function componentSection(pipeline) {
  if (pipeline.length === 0) {
    return ["## Components", "", "> ⚠️ No components directory found.", ""].join("\n");
  }

  const byStatus = {};
  const byType = {};
  const byImpl = { done: [], "in review": [], "in progress": [], todo: [] };

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

  const unreviewed = byImpl["in progress"].filter((c) => c.substate === "unreviewed").length;
  const implLine = [
    `${byImpl.done.length} done`,
    `${byImpl["in review"].length} in review`,
    `${byImpl["in progress"].length} in progress${unreviewed ? ` (${unreviewed} unreviewed)` : ""}`,
    `${byImpl.todo.length} todo`,
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
      "### In review — checklist open, awaiting human sign-off",
      "",
      "Generation is complete and renderable; each component works through its",
      "review checklist (committable WIP). Promote to `done` in Airtable",
      "(Implementation column) once every required item is checked.",
      "",
    );
    for (const c of byImpl["in review"]) {
      out.push(`#### Review checklist — ${c.name} (${c.type}, path: ${c.reviewPath ?? "not started"})`, "");
      c.checklist.forEach((item, i) => {
        if (item.na) {
          out.push(`${i + 1}. n/a ${item.label} — ${item.na}`);
        } else {
          const note = item.note ? ` — ${item.note}` : "";
          out.push(`${i + 1}. [${item.done ? "x" : " "}] ${item.label}${note}`);
        }
      });
      out.push("");
    }
  }

  if (byImpl["in progress"].length) {
    out.push(
      "### In progress — review pipeline not begun",
      "",
      "Code exists but the checklist hasn't started. `unreviewed` components never",
      "entered the loop (the old \"established\" backlog) — candidates to harden with",
      "`/review-component <Name>` when there's time. `scaffold-underway` means a",
      "`.run.json` is open with no render checkpoint yet.",
      "",
    );
    for (const c of byImpl["in progress"]) {
      out.push(`- \`${c.name}\` — maturity \`${c.maturity}\` · ${c.substate}`);
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

function pendingLearningsSection(reviewState) {
  const pending = Object.entries(reviewState)
    .filter(([, rec]) => rec.path === "adversarial" && rec.reviewedAt && !rec.learningsBackfilled)
    .map(([name, rec]) => ({ name, reviewedAt: rec.reviewedAt }));

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

  const reviewState = promoteReviewState();
  const pipeline = buildComponentPipeline(reviewState);

  const body = [
    governanceSection(governance, usage),
    componentSection(pipeline),
    pendingLearningsSection(reviewState),
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
