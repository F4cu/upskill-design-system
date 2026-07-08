#!/usr/bin/env node
// WCAG AA contrast gate on *built* token output (Issue #20). Reads the
// resolved custom properties from dist/css/theme.{light,dark}.css — never
// source JSON aliases — so it always checks what components actually render.
//
// PAIRS below is hand-curated, not derived from CSS co-occurrence. A first
// pass tried deriving pairs automatically (foreground tokens × background
// tokens referenced in the same CSS Module) but that over-generates: a
// single file's mutually-exclusive state variants (e.g. Button's default,
// disabled, and outlined variants) got cross-multiplied into pairs that never
// actually render together, producing dozens of false failures. Each entry
// here reflects a real rendered state, checked against every component's
// CSS Module — see the comment above each group.
//
// When adding or changing a component that sets a text/icon/border color
// (in its .module.css or inline), add the resulting foreground/background
// combination here — this is the convention that keeps a new component from
// shipping an unchecked pair (see .claude/rules/components.md "Two-tier a11y").
//
// Thresholds follow WCAG 2.1: 4.5:1 for text, 3:1 for icons and UI-component
// borders (1.4.11 non-text contrast). Some tokens carry a role override
// where the same alias plays a graphical rather than textual role (e.g. the
// Checkbox checkmark drawn with a "text" token).
//
// Decorative/disabled tokens are deliberately not paired at all:
// dividers and separators — border.subtle, border.strong, border.default,
//   border.inverted, border.accent, border.brand (AppHeader underline).
//   border.default/strong are also each control's *only* visible boundary
//   on Button's outlined variant, Chip, ButtonArrow, and Badge's outline
//   variant, with no background fill to help — a real WCAG 1.4.11 question,
//   evaluated and deliberately left decorative/unchecked here (matches how
//   the token is used everywhere else; those controls also carry text
//   color/shape/hover cues).
// disabled state — text.disabled, text.inverted.disabled, icon.disabled,
//   icon.inverted.disabled, border.disabled (WCAG 1.4.11 excludes inactive
//   UI components)
//
// Pairs that fail and are tracked as waivers (not silently dropped, not
// silently fixed) live in scripts/token-contrast-waivers.json — see that
// file and its linked issue.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WAIVERS_PATH = path.resolve(__dirname, "token-contrast-waivers.json");
const CSS_DIR = path.resolve(ROOT, "packages/tokens/dist/css");
const PRIMITIVES_CSS = path.resolve(CSS_DIR, "primitives.css");
const themeCss = (mode) => path.resolve(CSS_DIR, `theme.${mode}.css`);
const brandCss = (brand) => path.resolve(CSS_DIR, `brand.${brand}.css`);

function discoverBrands() {
  return fs
    .readdirSync(CSS_DIR)
    .filter((f) => /^brand\..+\.css$/.test(f))
    .map((f) => f.replace(/^brand\.(.+)\.css$/, "$1"));
}

// Rendered on whatever ambient surface a component is placed on (page or a
// default card/container) — the two general-purpose canvas backgrounds.
const AMBIENT = [
  "--ds-color-background-container-default",
  "--ds-color-background-container-page",
];

const T = (name) => `--ds-color-text-${name}`;
const I = (name) => `--ds-color-icon-${name}`;
const B = (name) => `--ds-color-border-${name}`;
const BG = (name) => `--ds-color-background-${name}`;

// [foreground, background, roleOverride?]
const PAIRS = [
  // Text, Heading, TextLink, reset.css <a> — typography with no background
  // of its own, rendered wherever placed.
  ...AMBIENT.flatMap((bg) => [
    [T("default"), bg],
    [T("subtle"), bg],
    [T("brand"), bg],
    [T("interactive-default"), bg],
    [T("interactive-hover"), bg],
  ]),

  // Button — default (primary) variant
  [T("inverted-default"), BG("button-default")],
  [T("inverted-default"), BG("button-hover")],
  // Button — outlined variant. Its border (border.default) is the same
  // low-contrast divider token used everywhere as a decorative separator
  // (Accordion, Card, Divider) — not checked here either; the variant is
  // still identifiable by its text color and hover fill.
  ...AMBIENT.map((bg) => [T("subtle"), bg]),
  [T("subtle"), BG("button-outline-hover")],
  // Button — ghost variant reuses the interactive text pairs above.

  // Chip — border.selected is a real state indicator (checked); the
  // unselected ring is the shared decorative border.default (not checked,
  // same reasoning as Button's outlined variant).
  ...AMBIENT.flatMap((bg) => [
    [T("subtle"), bg],
    [T("selected"), bg],
    [B("selected"), bg, "border"],
  ]),
  [T("subtle"), BG("neutral-subtlest")],
  [T("selected"), BG("neutral-subtlest")],

  // DropdownMenu — panel is container.default; hover/focus overlays neutral.hover
  [T("default"), BG("container-default")],
  [T("default"), BG("neutral-hover")],
  [T("brand"), BG("container-default")],
  [T("brand"), BG("neutral-hover")],

  // Checkbox — box border/fill sits on background.input; checkmark is a
  // graphic (icon role, not text) drawn on background.brand once checked
  [B("input-default"), BG("input"), "border"],
  [B("input-hover"), BG("input"), "border"],
  [T("inverted-default"), BG("brand"), "icon"],
  ...AMBIENT.map((bg) => [T("default"), bg]),

  // TextField — value/placeholder/icon sit on background.input; the border
  // states are the field's visible boundary; the error message renders
  // below the field, on the ambient surface
  [T("default"), BG("input")],
  [T("subtle"), BG("input"), "icon"], // iconSlot colors an <Icon> with text.subtle
  [B("input-default"), BG("input"), "border"],
  [B("input-hover"), BG("input"), "border"],
  [B("selected"), BG("input"), "border"],
  [B("feedback-error"), BG("input"), "border"],
  ...AMBIENT.map((bg) => [T("feedback-error"), bg]),

  // Select — same shape as TextField, plus the chevron icon
  [T("subtle"), BG("input")],
  [I("default"), BG("input")],

  // Accordion — title/chevron render on the ambient trigger surface when
  // collapsed, and on container.elevated once the panel is open
  ...[BG("container-elevated"), ...AMBIENT].flatMap((bg) => [
    [T("default"), bg],
    [I("default"), bg],
  ]),

  // ButtonArrow — icon-only round button. Border is the shared decorative
  // border.default/strong (not checked — see Button outlined, above).
  [T("default"), BG("neutral-subtlest"), "icon"],

  // AppHeader — fixed background.container.page
  [T("subtle"), BG("container-page")],
  [T("brand"), BG("container-page")],
  [T("default"), BG("container-page"), "icon"], // hamburger icon button

  // Breadcrumb — no background of its own (ambient, typically AppHeader)
  ...AMBIENT.flatMap((bg) => [
    [T("subtle"), bg],
    [T("default"), bg],
  ]),

  // CardHorizontal — default variant on a default card/container; inverted
  // variant is documented (component metadata) to require
  // background.container.inverted from its parent
  [T("default"), BG("container-default")],
  [T("inverted-default"), BG("container-inverted")],
  [T("inverted-subtle"), BG("container-inverted")],
  [I("subtle"), BG("container-default")],

  // CardVertical — badge icon, ambient (composed standalone or in a Card)
  ...AMBIENT.map((bg) => [I("subtle"), bg]),

  // Badge — outline variant's border is the shared decorative border.default
  // (not checked — same reasoning as Button's outlined variant, above).

  // ProgressBar — the fill is a meaningful graphical indicator (WCAG 1.4.11)
  // rendered on the track. The media placeholder tokens
  // (background.media.*, icon.media — Image, VideoFrame) are deliberately
  // not paired: the icon is a decorative watermark on an empty surface.
  [BG("progress"), BG("neutral-subtle"), "icon"],

  // Feedback tokens are not yet composed into a shipped component (no
  // Alert/Toast in the fixed set — see CLAUDE.md "Component scope"), but
  // they were part of this pass's fix and are meant to pair with their
  // matching feedback background band, so they're checked pre-emptively.
  [T("feedback-error"), BG("feedback-error")],
  [T("feedback-success"), BG("feedback-success")],
  [T("feedback-warning"), BG("feedback-warning")],
  [I("feedback-error"), BG("feedback-error")],
  [I("feedback-success"), BG("feedback-success")],
  [I("feedback-warning"), BG("feedback-warning")],

  // SplitChart (apps/showcase/src/pipeline/SplitChart.tsx, T5 dashboard
  // chart primitive) — segment fills and legend swatches always render
  // inside a Card, whose surface is background.container.elevated. These
  // are graphical marks (WCAG 1.4.11, 3:1), not text, so background-rooted
  // foregrounds get the "icon" role override to apply the 3:1 threshold.
  [I("feedback-success"), BG("container-elevated")],
  [I("feedback-warning"), BG("container-elevated")],
  [I("feedback-error"), BG("container-elevated")],
  [BG("brand"), BG("container-elevated"), "icon"],
  [I("subtle"), BG("container-elevated")],
  [BG("media-strong"), BG("container-elevated"), "icon"],
];

function roleOf(varName) {
  if (varName.startsWith("--ds-color-text-")) return "text";
  if (varName.startsWith("--ds-color-icon-")) return "icon";
  if (varName.startsWith("--ds-color-border-")) return "border";
  throw new Error(`Cannot infer role for token: ${varName}`);
}

function threshold(role) {
  return role === "text" ? 4.5 : 3;
}

function toDotPath(varName) {
  return varName.replace("--ds-color-", "").split("-").join(".");
}

function parseCss(file) {
  const content = fs.readFileSync(file, "utf8");
  const map = {};
  const re = /(--ds-[\w-]+):\s*([^;]+);/g;
  let m;
  while ((m = re.exec(content)) !== null) map[m[1]] = m[2].trim();
  return map;
}

// Resolve a custom property through its var() chain against a layered map.
// Cycle-guards via `seen`; throws on undefined names and cycles. Doubles as a
// runtime dangling-ref check for exactly the vars the paired components render.
function resolve(name, map, seen = new Set()) {
  if (seen.has(name)) {
    throw new Error(`Cycle resolving ${name}`);
  }
  seen.add(name);
  const value = map[name];
  if (value === undefined) {
    throw new Error(`Undefined custom property: ${name}`);
  }
  const m = value.match(/^var\((--ds-[\w-]+)\s*(?:,.*)?\)$/);
  if (m) return resolve(m[1], map, seen);
  return value;
}

function parseColor(value) {
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`Unrecognized color value: ${value}`);
  const [r, g, b, a = 1] = m[1].split(",").map((s) => parseFloat(s.trim()));
  return { r, g, b, a };
}

function compositeOver(fg, bg) {
  if (fg.a >= 1) return fg;
  return {
    r: fg.a * fg.r + (1 - fg.a) * bg.r,
    g: fg.a * fg.g + (1 - fg.a) * bg.g,
    b: fg.a * fg.b + (1 - fg.a) * bg.b,
    a: 1,
  };
}

function relativeLuminance({ r, g, b }) {
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

function evaluateTheme(theme, vars) {
  const baseCanvas = parseColor(
    resolve("--ds-color-background-container-default", vars)
  );
  const seen = new Set();
  const checked = [];

  for (const [foreground, background, roleOverride] of PAIRS) {
    const key = `${foreground}|${background}|${roleOverride || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const role = roleOverride || roleOf(foreground);
    const fgValue = resolve(foreground, vars);
    const bgValue = resolve(background, vars);

    const bgColor = compositeOver(parseColor(bgValue), baseCanvas);
    const fgColor = compositeOver(parseColor(fgValue), bgColor);
    const ratio = contrastRatio(fgColor, bgColor);
    const min = threshold(role);
    checked.push({ foreground, background, role, ratio, min, pass: ratio >= min });
  }

  return checked;
}

function formatRatio(ratio) {
  return `${ratio.toFixed(2)}:1`;
}

function loadWaivers() {
  return fs.existsSync(WAIVERS_PATH) ? JSON.parse(fs.readFileSync(WAIVERS_PATH, "utf8")) : [];
}

function main() {
  const waivers = loadWaivers();
  const waiverKey = (brand, theme, foreground, background) =>
    `${brand}|${theme}|${foreground}|${background}`;
  const waiverMap = new Map(
    waivers.map((w) => [waiverKey(w.brand, w.theme, w.foreground, w.background), w])
  );
  const usedWaivers = new Set();
  let totalFailures = 0;

  const primitives = parseCss(PRIMITIVES_CSS);
  const brands = discoverBrands();

  for (const brand of brands) {
    const brandVars = parseCss(brandCss(brand));
    for (const theme of ["light", "dark"]) {
      const themeVars = parseCss(themeCss(theme));
      const vars = { ...primitives, ...brandVars, ...themeVars };
      const checked = evaluateTheme(theme, vars);
      const failures = checked.filter((r) => !r.pass);

      console.log(`\nBrand: ${brand} · Theme: ${theme}`);
      console.log(`  ${checked.length} pair(s) checked.`);

      const realFailures = [];
      const waivedFailures = [];
      for (const f of failures) {
        const key = waiverKey(brand, theme, f.foreground, f.background);
        const waiver = waiverMap.get(key);
        if (waiver) {
          usedWaivers.add(key);
          waivedFailures.push({ ...f, waiver });
        } else {
          realFailures.push(f);
        }
      }
      totalFailures += realFailures.length;

      if (realFailures.length) {
        for (const f of realFailures) {
          console.error(
            `  ✗ ${toDotPath(f.foreground)} on ${toDotPath(f.background)} — ${formatRatio(f.ratio)} (needs ${f.min}:1)`
          );
        }
      } else {
        console.log(`  ✓ All checked pairs meet their WCAG AA threshold (besides tracked waivers).`);
      }
      for (const f of waivedFailures) {
        console.log(
          `  ⚠ waived: ${toDotPath(f.foreground)} on ${toDotPath(f.background)} — ${formatRatio(f.ratio)} (needs ${f.min}:1) — issue #${f.waiver.issue}`
        );
      }
    }
  }

  const staleWaivers = waivers.filter(
    (w) => !usedWaivers.has(waiverKey(w.brand, w.theme, w.foreground, w.background))
  );
  if (staleWaivers.length) {
    console.error("\nStale waiver(s) — no longer failing, remove from scripts/token-contrast-waivers.json:");
    for (const w of staleWaivers) {
      console.error(`  ✗ ${w.brand}|${w.theme}: ${toDotPath(w.foreground)} on ${toDotPath(w.background)}`);
    }
    totalFailures += staleWaivers.length;
  }

  if (totalFailures) {
    console.error(`\n${totalFailures} contrast regression(s) found.`);
    process.exit(1);
  }
  console.log("\n✓ Token contrast check passed for light and dark themes.");
}

main();
