// Prop vocabulary and state-model naming (ADR-025, ADR-026), checked on a
// component's spec props. spec:validate already proves the spec props equal
// the code props, so checking the spec checks the code. Called from
// scripts/validate-spec.js; the rules here replace prose that used to live in
// packages/components/AGENTS.md. A known exception is waived by id in
// scripts/prop-vocabulary-waivers.json (a shrinking ledger: never add to it to
// get a new component through).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WAIVERS = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/prop-vocabulary-waivers.json"), "utf8")).waivers.map((w) => w.id));

const STYLE_SYNONYMS = new Set(["type", "kind", "mode", "style", "tone", "appearance"]);
const BANNED_NAMES = {
  state: "states split by who sets them (ADR-025): interaction is CSS, configured state is its own prop",
  hover: "interaction state is a CSS pseudo-class, never a prop (ADR-025)",
  focus: "interaction state is a CSS pseudo-class, never a prop (ADR-025)",
  focused: "interaction state is a CSS pseudo-class, never a prop (ADR-025)",
  hovered: "interaction state is a CSS pseudo-class, never a prop (ADR-025)",
  active: "`active` is the momentary :active press; a persistent toggle is `pressed`, a current item is `current`",
  expanded: "disclosure state is `open` / `defaultOpen` / `onOpenChange`",
  visible: "disclosure state is `open` / `defaultOpen` / `onOpenChange`",
  onClose: "use `open` + `onOpenChange`, never a bare `onClose`",
  selected: "a group that owns the choice holds `value` on the container; a toggle is `pressed`",
  invalid: "`error` (message string) — its presence means invalid",
};
const BANNED_PREFIX = [
  [/^(is|has|show)[A-Z]/, "booleans are a bare adjective or participle (`disabled`, `certified`); `Has <x>` is Figma-only"],
  [/^handle[A-Z]/, "callbacks are `on<Verb>` / `on<Part><Verb>`"],
  [/^selected[A-Z]/, "a group that owns the choice holds `value` on the container"],
];
const FIXED_OPTIONS = { shape: ["square", "round"], orientation: ["horizontal", "vertical"] };
const SIZE_STEPS = ["sm", "md", "lg"];

const usedWaivers = new Set();
const isFunction = (type) => /=>|Handler\b/.test(type);
const figmaKey = (s) => s.toLowerCase().replace(/[\s_-]/g, "");

// Returns ["<rule-id>: message", …] for one component's spec props.
export function vocabularyErrors(name, spec) {
  const errors = [];
  const fail = (key, rule, msg) => {
    const id = `${name}:${key}:${rule}`;
    if (WAIVERS.has(id)) usedWaivers.add(id);
    else errors.push(`vocabulary ${rule}: "${key}" — ${msg} (waiver id ${name}:${key}:${rule})`);
  };
  const keys = new Set(Object.keys(spec.props));

  for (const [key, def] of Object.entries(spec.props)) {
    const dot = key.lastIndexOf(".");
    const prefix = key.slice(0, dot + 1);
    const prop = key.slice(dot + 1);
    const native = def.kind === "native";
    const type = String(def.type ?? "");

    if (!native && STYLE_SYNONYMS.has(prop)) fail(key, "variant-name", "visual style is `variant`, never type/kind/mode/style/tone/appearance");
    if (BANNED_NAMES[prop]) fail(key, "banned-name", BANNED_NAMES[prop]);
    for (const [re, why] of BANNED_PREFIX) if (re.test(prop)) fail(key, "banned-prefix", why);

    if (type === "boolean" && !native && def.kind !== "controlledState" && def.default !== false) {
      fail(key, "boolean-default", `a boolean flag defaults to \`false\` (is ${JSON.stringify(def.default)})`);
    }
    if (isFunction(type) && !/^on[A-Z]/.test(prop)) fail(key, "event-name", "a callback prop is `on<Verb>` / `on<Part><Verb>`");

    const dflt = prop.match(/^default([A-Z]\w*)$/);
    if (dflt) {
      const x = dflt[1][0].toLowerCase() + dflt[1].slice(1);
      for (const need of [x, `on${dflt[1]}Change`]) {
        if (!keys.has(prefix + need)) fail(key, "controlled-triple", `\`default<X>\` needs \`${need}\` (\`<x>\` / \`default<X>\` / \`on<X>Change\`)`);
      }
    }
    const change = prop.match(/^on([A-Z]\w*)Change$/);
    if (change) {
      const x = change[1][0].toLowerCase() + change[1].slice(1);
      if (!keys.has(prefix + x)) fail(key, "controlled-triple", `\`on<X>Change\` is named after its prop; \`${x}\` is missing`);
    }

    if (/\[\]$/.test(type) && !/^(items|options)$|Items$/.test(prop)) fail(key, "collection-name", "a collection is `items` (`<part>Items` when there are several; form inputs keep `options`)");
    if (prop === "error" && type !== "string") fail(key, "error-type", "`error` is the message string; its presence means invalid");

    if (def.kind === "variantAxis" && def.options) {
      if (FIXED_OPTIONS[prop] && !def.options.every((o) => FIXED_OPTIONS[prop].includes(o))) {
        fail(key, "axis-values", `\`${prop}\` takes ${FIXED_OPTIONS[prop].join("/")}`);
      }
      if (prop === "size") {
        const steps = def.options.filter((o) => SIZE_STEPS.includes(o));
        if (steps.length && steps.length !== def.options.length) fail(key, "axis-values", "`size` takes sm/md/lg steps, or type-scale names, never a mix");
      }
    }

    const fig = def.figma ?? {};
    if (fig.surface === "both" && fig.property && prop !== "children") {
      const names = fig.property.split(" + ").filter((p) => !/^Has /.test(p));
      if (names.length && !names.some((p) => figmaKey(p) === figmaKey(prop))) {
        fail(key, "figma-name", `Figma property "${fig.property}" differs from the prop by more than casing; record the mapping (ADR-026) or rename`);
      }
    }
    if (fig.property && /(^|\+ )State$/.test(fig.property)) fail(key, "figma-state", "Figma `State` is reserved for the interaction preview");
  }
  return errors;
}

// Waivers that no longer match a violation: the ledger only shrinks, so a
// fixed entry must be deleted. Meaningful only after every spec was checked.
export const staleWaivers = () => [...WAIVERS].filter((id) => !usedWaivers.has(id));
