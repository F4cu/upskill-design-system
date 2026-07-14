#!/usr/bin/env node

// Screenshot-baseline visual regression (ADR-019).
//
// Snapshots each component's canonical --default story in light + dark from a
// running Storybook and diffs against committed baselines, so a change to a
// shared primitive or a device token can't silently shift components.
//
// Usage:
//   node scripts/screenshot.js check                        diff fresh shots against baselines
//   node scripts/screenshot.js approve [--component Name]   regenerate baselines (all, or one pair)
//
// Env: STORYBOOK_URL (default http://localhost:6006)
//      SCREENSHOT_DIFF_RATIO (allowed diff-pixel ratio, default 0.0001 — local
//        renders are deterministic; CI overrides to 0.01 for cross-OS antialiasing)
//
// The capture core (iframe URL, viewport, settle strategy) is replicated from
// .claude/skills/run-storybook/driver.mjs — kept in sync by hand, but this
// script runs one browser instance for all shots instead of one per shot.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = process.env.STORYBOOK_URL || "http://localhost:6006";
const DIFF_RATIO = parseFloat(process.env.SCREENSHOT_DIFF_RATIO || "0.0001");
const PIXEL_THRESHOLD = 0.1;
const THEMES = ["light", "dark"];

const SHOTS_DIR = path.resolve(__dirname, "../packages/components/screenshots");
const DIFF_DIR = path.join(SHOTS_DIR, ".diff");
const COMPONENTS_DIR = path.resolve(__dirname, "../packages/components/src/components");

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error(
      "playwright is not installed (kept on-demand, never a saved dependency).\n" +
        "  npm install --no-save playwright\n" +
        "  npx playwright install chromium"
    );
    process.exit(1);
  }
}

async function fetchDefaultStories() {
  let json;
  try {
    const res = await fetch(`${BASE}/index.json`);
    if (!res.ok) throw new Error(`index.json ${res.status}`);
    json = await res.json();
  } catch (e) {
    console.error(
      `Cannot reach Storybook at ${BASE} (${e.message}).\n` +
        "Start one first:\n" +
        "  npm run storybook                                          (dev server)\n" +
        "  npm run build:storybook -w @upskill/components && npx http-server packages/components/storybook-static -p 6006"
    );
    process.exit(1);
  }
  // Component stories live under several title prefixes (Components/, Layout/,
  // Typography/), so enumeration is dir-driven: each directory in
  // packages/components/src/components/ must match exactly one --default story
  // by name, whatever its prefix. Showcase stories (layout-examples-*) match no
  // directory and fall out naturally.
  const defaults = Object.values(json.entries)
    .filter((e) => e.type === "story" && e.id.endsWith("--default"))
    .map((e) => e.id);
  const dirs = fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const stories = [];
  const bad = [];
  for (const dir of dirs) {
    const key = dir.toLowerCase();
    const matches = defaults.filter((id) => storyKey(id) === key);
    if (matches.length === 1) stories.push(matches[0]);
    else bad.push(`${dir}: ${matches.length ? matches.join(", ") : "no --default story"}`);
  }
  if (bad.length) {
    console.error(
      "Story guard failed — every component directory needs exactly one canonical --default story:\n  " +
        bad.join("\n  ")
    );
    process.exit(1);
  }
  return stories.sort();
}

// "layout-box--default" -> "box"; "components-cardhorizontal--default" -> "cardhorizontal"
const storyKey = (id) =>
  id.slice(id.indexOf("-") + 1, -"--default".length).replace(/-/g, "");

function iframeUrl(id, theme) {
  return `${BASE}/iframe.html?viewMode=story&id=${id}&globals=theme:${theme}`;
}

function baselinePath(id, theme) {
  return path.join(SHOTS_DIR, `${id}.${theme}.png`);
}

async function captureAll(stories, onShot) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  async function shoot(id, theme) {
    errors = [];
    await page.goto(iframeUrl(id, theme), { waitUntil: "networkidle" });
    await page.waitForSelector("#storybook-root > *", { timeout: 15000 });
    await page.waitForTimeout(300);
    const buffer = await page.screenshot({ fullPage: true });
    return { buffer, errors: [...errors] };
  }

  try {
    for (const id of stories) {
      for (const theme of THEMES) {
        let result;
        try {
          result = await shoot(id, theme);
          if (result.errors.length) result = await shoot(id, theme); // one retry
        } catch (e) {
          result = await shoot(id, theme); // one retry; a second failure throws
        }
        await onShot(id, theme, result);
      }
    }
  } finally {
    await browser.close();
  }
}

function diffShot(id, theme, buffer) {
  const file = baselinePath(id, theme);
  if (!fs.existsSync(file)) return { status: "NEW", ratio: null };

  const fresh = PNG.sync.read(buffer);
  const base = PNG.sync.read(fs.readFileSync(file));
  if (fresh.width !== base.width || fresh.height !== base.height) {
    return {
      status: "FAIL",
      ratio: null,
      note: `size ${base.width}x${base.height} (baseline) vs ${fresh.width}x${fresh.height} (fresh)`,
    };
  }

  const diff = new PNG({ width: base.width, height: base.height });
  const diffPixels = pixelmatch(base.data, fresh.data, diff.data, base.width, base.height, {
    threshold: PIXEL_THRESHOLD,
  });
  const ratio = diffPixels / (base.width * base.height);
  if (ratio > DIFF_RATIO) {
    fs.mkdirSync(DIFF_DIR, { recursive: true });
    fs.writeFileSync(path.join(DIFF_DIR, `${id}.${theme}.png`), PNG.sync.write(diff));
    return { status: "FAIL", ratio };
  }
  return { status: "PASS", ratio };
}

function printTable(rows) {
  const w1 = Math.max(...rows.map((r) => r.id.length), 8);
  for (const r of rows) {
    const ratio = r.ratio == null ? "-" : `${(r.ratio * 100).toFixed(3)}%`;
    console.log(
      `${r.id.padEnd(w1)}  ${r.theme.padEnd(5)}  ${r.status.padEnd(7)}  ${ratio}${r.note ? `  ${r.note}` : ""}`
    );
  }
}

function orphanedBaselines(stories) {
  if (!fs.existsSync(SHOTS_DIR)) return [];
  const expected = new Set(stories.flatMap((id) => THEMES.map((t) => `${id}.${t}.png`)));
  return fs
    .readdirSync(SHOTS_DIR)
    .filter((f) => f.endsWith(".png") && !expected.has(f));
}

async function check() {
  const stories = await fetchDefaultStories();
  const rows = [];
  const consoleErrors = [];
  await captureAll(stories, async (id, theme, { buffer, errors }) => {
    if (errors.length) consoleErrors.push({ id, theme, errors });
    rows.push({ id, theme, ...diffShot(id, theme, buffer) });
  });

  for (const f of orphanedBaselines(stories)) {
    rows.push({ id: f, theme: "-", status: "MISSING", ratio: null, note: "orphaned baseline, no matching story" });
  }
  printTable(rows);

  for (const { id, theme, errors } of consoleErrors) {
    console.error(`\nconsole errors in ${id} (${theme}):\n  ${errors.join("\n  ")}`);
  }

  const bad = rows.filter((r) => r.status !== "PASS");
  if (bad.length || consoleErrors.length) {
    const news = bad.filter((r) => r.status === "NEW").length;
    console.error(
      `\n${bad.length} shot(s) not passing, ${consoleErrors.length} with console errors.` +
        (bad.some((r) => r.status === "FAIL") ? ` Diff images: ${path.relative(process.cwd(), DIFF_DIR)}/` : "") +
        (news ? "\nNEW shots have no baseline yet — run: npm run screenshot:approve" : "")
    );
    process.exit(1);
  }
  console.log(`\n${rows.length} shots, all passing.`);
}

async function approve(componentName) {
  let stories = await fetchDefaultStories();
  if (componentName) {
    const key = componentName.toLowerCase().replace(/[^a-z0-9]/g, "");
    stories = stories.filter((id) => storyKey(id) === key);
    if (!stories.length) {
      console.error(`No components-*--default story matches component "${componentName}".`);
      process.exit(1);
    }
  }

  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const consoleErrors = [];
  await captureAll(stories, async (id, theme, { buffer, errors }) => {
    if (errors.length) {
      consoleErrors.push({ id, theme, errors });
      return; // never bake an errored render into a baseline
    }
    fs.writeFileSync(baselinePath(id, theme), buffer);
    console.log(`wrote ${id}.${theme}.png`);
  });

  if (!componentName) {
    for (const f of orphanedBaselines(stories)) {
      fs.unlinkSync(path.join(SHOTS_DIR, f));
      console.log(`pruned ${f} (no matching story)`);
    }
  }

  for (const { id, theme, errors } of consoleErrors) {
    console.error(`\nSKIPPED ${id} (${theme}) — console errors:\n  ${errors.join("\n  ")}`);
  }
  if (consoleErrors.length) process.exit(1);
}

const [cmd, ...rest] = process.argv.slice(2);
const componentFlag = rest[rest.indexOf("--component") + 1];
const run = {
  check: () => check(),
  approve: () => approve(rest.includes("--component") ? componentFlag : undefined),
}[cmd];

if (!run) {
  console.error("usage: node scripts/screenshot.js check | approve [--component <Name>]");
  process.exit(1);
}
run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
