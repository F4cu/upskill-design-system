#!/usr/bin/env node
// Drafts <Name>.spec.json (ADR-027) from what the component already is: its
// props types, its JSX and its CSS Module. This is the backfill tool for a
// component that has no spec yet. A new component's spec is written before its
// code by /component-scaffold; running this afterwards only re-syncs the
// derived fields.
//
// Derived from code: prop names, types, options, defaults, a kind guess
// (variantAxis, controlledState, event, element, content), anatomy parts with
// their element and builtOn, states from pseudo-classes, and styles (token
// paths, option classes, pseudo-classes, private --_x custom properties).
//
// Left as TODO for the agent or developer, because code cannot say it: each
// part's role, the vocabulary concept of a prop, its Figma property, why a raw
// value is raw, constraints, and any selector the generator cannot place.
// `npm run spec:validate` fails while a TODO remains.
//
// An existing spec is merged, never overwritten: its authored fields (concept,
// figma, anatomy, states, styles, constraints) are kept, the derived prop
// fields (options, default) are refreshed, and new props are added.
// New parts, states and unplaced selectors are only reported.
//
// Usage: npm run spec:generate -- <Name> [--fresh] [--out <file>]
//   --fresh   ignore an existing spec (accuracy checks against the pilots)
//   --out     write there instead of <Name>.spec.json

import fs from "fs";
import path from "path";
import ts from "typescript";
import postcss from "postcss";
import { ROOT, readJson, publicComponents, tokenSourceTree, tokenPathsByCssVar } from "./lib.js";
import { createPropsReader } from "./spec-props.js";

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--out");
const fresh = args.includes("--fresh");
const outIdx = args.indexOf("--out");
if (!name) {
  console.error("Usage: npm run spec:generate -- <Name> [--fresh] [--out <file>]");
  process.exit(2);
}

const dir = path.join(ROOT, "packages/components/src/components", name);
const tsxFile = path.join(dir, "index.tsx");
const cssFile = path.join(dir, `${name}.module.css`);
const metaFile = path.join(dir, `${name}.metadata.json`);
const specFile = path.join(dir, `${name}.spec.json`);
const outFile = outIdx === -1 ? specFile : path.resolve(args[outIdx + 1]);
for (const f of [tsxFile, metaFile]) {
  if (!fs.existsSync(f)) {
    console.error(`No ${path.relative(ROOT, f)} — nothing to generate from.`);
    process.exit(2);
  }
}

const metadata = readJson(metaFile);
const existing = !fresh && fs.existsSync(specFile) ? readJson(specFile) : null;
const COMPONENTS = publicComponents();
const pathByCssVar = tokenPathsByCssVar(tokenSourceTree());
const todo = [];
const note = (msg) => todo.push(msg);

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const camel = (kebab) => kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const sentence = (camelName) => cap(camelName.replace(/([A-Z])/g, " $1").toLowerCase().trim());

// ── props ────────────────────────────────────────────────────────────────

const reader = createPropsReader({ names: [name] });
const propTypes = reader.readPropsTypes(name);
if (!propTypes.has("")) {
  console.error(`index.tsx declares no exported ${name}Props type alias.`);
  process.exit(1);
}

const CONCEPTS = {
  variant: "Visual weight/style", size: "Size", shape: "Corners", orientation: "Layout axis",
  direction: "Glyph direction", status: "Lifecycle", children: "Content", as: "Element",
  headingLevel: "Inner heading", href: "Link", icon: "Icon", trailingIcon: "Icon",
  label: "Accessible name", error: "Error", items: "Collection", src: "Image", alt: "Image",
};

const literalsInOrder = (symbol) => {
  const type = reader.checker.getTypeOfSymbol(symbol);
  return (type.isUnion() ? type.types : [type]).filter((x) => x.isStringLiteral()).map((x) => x.value);
};

function guessKind(prop, ownNames) {
  if (prop.startsWith("aria-")) return "native";
  if (/^on[A-Z]/.test(prop)) return prop.endsWith("Change") && ownNames.has(prop.slice(2, -6).replace(/^./, (c) => c.toLowerCase())) ? "controlledState" : "event";
  if (/^default[A-Z]/.test(prop)) return "controlledState";
  if (prop === "as") return "element";
  if (ownNames.has(`on${cap(prop)}Change`)) return "controlledState";
  if (metadata.variants?.[prop]) return "variantAxis";
  if (prop === "status") return "lifecycle";
  return "content";
}

const props = {};
const optionsByProp = new Map();
const booleanProps = new Set();
for (const [prefix, { part, own, declared, defaults, all }] of propTypes) {
  for (const prop of own) {
    const key = prefix + prop;
    const { typeText } = declared.get(prop);
    const type = typeText.replace(/\s+/g, " ").replace(/\bReact\./g, "").trim();
    const literals = literalsInOrder(all.get(prop));
    const kind = guessKind(prop, own);
    const def = {};
    def.kind = kind;
    def.type = type;
    if (kind === "variantAxis" || kind === "lifecycle") if (literals.length) def.options = literals;
    def.default = defaults.has(prop) ? defaults.get(prop) : type === "boolean" && kind !== "controlledState" ? false : null;
    if (literals.length && (kind === "variantAxis" || !part)) optionsByProp.set(prop, literals);
    if (type === "boolean") booleanProps.add(prop);
    const codeOnly = kind === "native" || kind === "event" || kind === "element" || /^default[A-Z]/.test(prop) || ["className", "id", "ref"].includes(prop) || (kind === "controlledState" && /^on/.test(prop)) || !!part;
    const concept =
      (prop.startsWith("aria-") ? "Accessible name" : null) ??
      CONCEPTS[prop] ??
      (kind === "event" ? "Discrete event" : kind === "controlledState" ? "Controlled state" : type === "boolean" ? "Boolean" : null);
    def.concept = concept ?? "TODO: name the ADR-026 vocabulary row, or 'new term: <reason>'";
    def.figma = codeOnly
      ? { surface: "code-only" }
      : { surface: "both", property: sentence(prop), note: `TODO: confirm the Figma property "${sentence(prop)}" against the component set` };
    props[key] = def;
  }
}

if (existing) {
  const merged = {};
  for (const [key, old] of Object.entries(existing.props)) {
    const derived = props[key];
    if (derived) merged[key] = { ...old, ...(derived.options ? { options: derived.options } : {}), default: old.kind === "controlledState" ? old.default : derived.default };
    else {
      merged[key] = old;
      if (old.kind !== "native" && old.figma?.surface !== "figma-only") note(`props["${key}"] is in the spec but no longer declared by the component`);
    }
  }
  for (const [key, derived] of Object.entries(props)) merged[key] ??= derived;
  for (const key of Object.keys(props)) delete props[key];
  Object.assign(props, merged);
}

// ── JSX: which element carries which styles.<class> ─────────────────────

const source = ts.createSourceFile(tsxFile, fs.readFileSync(tsxFile, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const classElement = new Map(); // class -> tag of its first JSX element
const dynamicProps = new Set(); // props used as styles[prop]
const libraryUses = []; // library components rendered, in order
let rootClass = null;
(function visit(node) {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    const tag = node.tagName.getText(source);
    const classAttr = node.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(source) === "className");
    if (/^[A-Z]/.test(tag) && COMPONENTS.has(tag) && tag !== name && !libraryUses.includes(tag)) libraryUses.push(tag);
    if (classAttr) {
      const text = classAttr.getText(source);
      const refs = [...text.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map((m) => m[1]);
      for (const m of text.matchAll(/styles\[(\w+)\]/g)) dynamicProps.add(m[1]);
      for (const c of refs) {
        if (!classElement.has(c)) classElement.set(c, tag);
        rootClass ??= c;
      }
    }
  }
  ts.forEachChild(node, visit);
})(source);

// ── class → condition ────────────────────────────────────────────────────

const classCondition = new Map(); // class -> { prop, value } | null (ambiguous)
for (const [prop, options] of optionsByProp) {
  for (const o of options) {
    const prev = classCondition.get(o);
    if (prev === undefined) classCondition.set(o, { prop, value: o });
    else if (prev && dynamicProps.has(prop) && !dynamicProps.has(prev.prop)) classCondition.set(o, { prop, value: o });
    else if (prev && dynamicProps.has(prop) === dynamicProps.has(prev.prop)) classCondition.set(o, null);
  }
}
for (const p of booleanProps) if (!classCondition.has(p)) classCondition.set(p, { prop: p, value: "true" });

const isModifier = (cls) => classCondition.has(cls);
const partName = (cls) => (cls === rootClass ? "Root" : /^[A-Za-z][A-Za-z0-9]*$/.test(cls) ? cap(cls) : null);

// ── selectors ────────────────────────────────────────────────────────────

function parseSelector(sel) {
  const compounds = [];
  let depth = 0;
  let cur = "";
  const flush = () => { if (cur.trim()) compounds.push(cur.trim()); cur = ""; };
  for (const ch of sel.trim()) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && /[\s>+~]/.test(ch)) flush();
    else cur += ch;
  }
  flush();
  return compounds.map((c) => {
    const out = { classes: [], pseudos: [], attrs: [], tags: [], raw: c };
    for (const m of c.matchAll(/\.([\w-]+)|(::?)([\w-]+)(\((?:[^()]|\([^()]*\))*\))?|\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]|(^|[^\w-])([a-z][\w-]*)/g)) {
      if (m[1]) { if (!out.classes.includes(m[1])) out.classes.push(m[1]); }
      else if (m[3]) out.pseudos.push({ name: m[3], arg: m[4] ?? null, element: m[2] === "::" });
      else if (m[5]) out.attrs.push({ name: m[5], value: m[6] ?? m[7] ?? m[8] ?? null });
      else if (m[10]) out.tags.push(m[10]);
    }
    return out;
  });
}

const STATE_PSEUDOS = { hover: "hover", active: "active", disabled: "disabled", "focus-visible": "focus-visible", focus: "focus", checked: "checked" };
const states = new Map(); // name -> trigger

// Resolves one selector alternative to { part, when } or { todo }.
function interpret(sel) {
  const compounds = parseSelector(sel);
  if (!compounds.length) return { todo: sel };
  const target = compounds[compounds.length - 1];
  const ancestors = compounds.slice(0, -1);
  if (sel.includes(":global") || compounds.some((c) => c.pseudos.some((p) => p.element || p.name === "has" || p.name === "global"))) return { todo: sel };
  if (ancestors.some((c) => c.pseudos.length || c.attrs.length || c.classes.some(isModifier))) return { todo: sel };
  if (target.tags.length && !target.classes.length) return { todo: sel };
  if (target.tags.length) return { todo: sel };

  const when = {};
  const addWhen = (prop, value) => { if (when[prop] !== undefined && when[prop] !== value) return false; when[prop] = value; return true; };
  const partClasses = target.classes.filter((c) => !isModifier(c));
  for (const c of target.classes.filter(isModifier)) {
    const cond = classCondition.get(c);
    if (!cond || !addWhen(cond.prop, cond.value)) return { todo: sel };
  }
  for (const c of target.pseudos) {
    if (c.name === "not") continue;
    const state = STATE_PSEUDOS[c.name];
    if (!state || !addWhen("state", state)) return { todo: sel };
    states.set(state, `:${c.name}`);
  }
  for (const a of target.attrs) {
    const prop = a.name.startsWith("data-") ? camel(a.name.slice(5)) : null;
    if (!prop || !props[prop] || a.value == null || !addWhen(prop, a.value)) return { todo: sel };
  }
  if (partClasses.length > 1) return { todo: sel };
  const cls = partClasses[0] ?? rootClass;
  const part = partName(cls);
  if (!part) return { todo: sel };
  return { part, cls, when };
}

// ── CSS → styles ─────────────────────────────────────────────────────────

const STRUCTURAL = /^(display|position|flex|flex-[a-z-]+|align-[a-z-]+|justify-[a-z-]+|place-[a-z-]+|order|cursor|overflow(-[xy])?|white-space|box-sizing|pointer-events|user-select|text-align|text-decoration|text-overflow|transition|animation|appearance|list-style|visibility|content|vertical-align|object-fit|resize|float|clear|isolation|inset|will-change|grid-[a-z-]+|-webkit-[a-z-]+)$/;

function styleValue(prop, value) {
  const v = value.replace(/\s+/g, " ").trim();
  const tokens = [...v.matchAll(/var\((--ds-[a-z0-9-]+)\)/g)];
  if (tokens.length) {
    const unknown = tokens.find((m) => !pathByCssVar.has(m[1]));
    if (unknown) return { literal: v, reason: `TODO: ${unknown[1]} is not a token` };
    if (tokens.length === 1 && tokens[0][0] === v) return pathByCssVar.get(tokens[0][1]);
    return { template: v.replace(/var\((--ds-[a-z0-9-]+)\)/g, (_, cssVar) => `{${pathByCssVar.get(cssVar)}}`) };
  }
  if (STRUCTURAL.test(prop)) return undefined;
  return { literal: v, reason: "TODO: why this value is not a token (or add the token)" };
}

const css = fs.existsSync(cssFile) ? postcss.parse(fs.readFileSync(cssFile, "utf8")) : postcss.parse("");

// Private custom properties (--_x): the first property that reads one is its
// canonical property; the rule that defines it sets that property instead.
const privateOwner = new Map();
css.walkDecls((d) => {
  const m = d.value.match(/var\((--_[\w-]+)/);
  if (m && !d.prop.startsWith("--") && !privateOwner.has(m[1])) privateOwner.set(m[1], d.prop === "border" ? "border-color" : d.prop);
});

const BORDER = /^border(-(top|right|bottom|left))?$/;
function expand(decl) {
  // [property, value] pairs the spec records for one declaration
  if (decl.prop.startsWith("--_")) {
    const owner = privateOwner.get(decl.prop);
    return owner ? [[owner, decl.value]] : [];
  }
  if (BORDER.test(decl.prop) && decl.value.includes(" ")) {
    const parts = decl.value.replace(/var\(([^()]*)\)/g, (m) => m.replace(/\s+/g, "")).split(/\s+/);
    const out = [];
    for (const p of parts) {
      if (/^(solid|dashed|dotted|none)$/.test(p)) continue;
      if (/^[\d.]+(px|rem|em)$/.test(p)) out.push([`${decl.prop}-width`, p]);
      else {
        const fallback = p.match(/^var\(--_[\w-]+,(.+)\)$/);
        out.push([`${decl.prop}-color`, fallback ? fallback[1] : p]);
      }
    }
    return out;
  }
  const priv = decl.value.match(/^var\((--_[\w-]+)(?:,\s*([^)]+))?\)$/);
  if (priv) {
    const owner = privateOwner.get(priv[1]);
    if (owner && owner !== decl.prop) return [[decl.prop, { sameAs: owner }]];
    return priv[2] ? [[decl.prop, priv[2].trim()]] : [];
  }
  return [[decl.prop, decl.value]];
}

const generated = {}; // part -> rules
const unresolved = [];
const keyOf = (r) => JSON.stringify(r.when);

css.walkRules((rule) => {
  const sets = {};
  rule.walkDecls((d) => {
    for (const [prop, raw] of expand(d)) {
      const v = typeof raw === "string" ? styleValue(prop, raw) : raw;
      if (v !== undefined) sets[prop] = v;
    }
  });
  if (!Object.keys(sets).length) return;
  for (const sel of rule.selectors) {
    const r = interpret(sel);
    if (r.todo) {
      unresolved.push(r.todo);
      const part = partName(rootClass) ?? "Root";
      (generated[part] ??= []).push({ when: { TODO: r.todo }, set: sets });
      continue;
    }
    (generated[r.part] ??= []).push({ when: r.when, set: { ...sets } });
  }
});

// Fold rules that share a part and condition, keeping source order.
const styles = {};
for (const [part, rules] of Object.entries(generated)) {
  const folded = [];
  for (const rule of rules) {
    const same = folded.find((f) => keyOf(f) === keyOf(rule));
    if (same) Object.assign(same.set, rule.set);
    else folded.push({ when: rule.when, set: { ...rule.set } });
  }
  styles[part] = folded;
}

if (unresolved.length && !existing) note(`${unresolved.length} selector(s) could not be placed: ${[...new Set(unresolved)].join(" | ")}`);

// ── anatomy ──────────────────────────────────────────────────────────────

const anatomy = [];
const seen = new Set();
const metadataParts = metadata.composition?.parts ?? [];
const addPart = (partNameValue, element, builtOn) => {
  if (seen.has(partNameValue)) return;
  seen.add(partNameValue);
  anatomy.push({
    name: partNameValue,
    element,
    ...(builtOn ? { builtOn } : {}),
    role: "TODO: the role this part exposes to assistive technology, or 'presentation'",
    required: true,
  });
};
const tagByPart = new Map([...classElement].map(([cls, tag]) => [partName(cls), tag]));
for (const part of metadataParts) addPart(part.name, tagByPart.get(part.name) ?? "TODO: the element this part renders", part.builtOn);
if (rootClass) addPart("Root", classElement.get(rootClass), COMPONENTS.has(classElement.get(rootClass)) ? classElement.get(rootClass) : undefined);
for (const [cls, tag] of classElement) {
  if (isModifier(cls) || cls === rootClass) continue;
  const p = partName(cls);
  if (p) addPart(p, tag, COMPONENTS.has(tag) ? tag : undefined);
}
if (!metadataParts.length) for (const tag of libraryUses) if (!anatomy.some((a) => a.builtOn === tag)) addPart(tag, tag, tag);
for (const part of Object.keys(styles)) if (!seen.has(part)) addPart(part, "TODO: the element this part renders", undefined);

// ── assemble, merge, write ───────────────────────────────────────────────

// ADR-025 kind by state name; anything else is flagged for a human.
const KIND = {
  default: "interaction", hover: "interaction", active: "interaction", focus: "interaction", "focus-visible": "interaction",
  visited: "interaction", "link-active": "interaction", "item-hover": "interaction", "item-active": "interaction",
  disabled: "appData", checked: "appData", unchecked: "appData", pressed: "appData", open: "appData", closed: "appData",
  error: "appData", empty: "content",
};
const statesOut = [{ name: "default", kind: "interaction", trigger: "rest" }];
for (const [s, trigger] of states) statesOut.push({ name: s, kind: KIND[s] ?? "interaction", trigger });
for (const { state, description } of metadata.states ?? []) {
  const have = statesOut.find((s) => s.name === state);
  if (have) have.notes = description;
  else {
    const known = KIND[state];
    statesOut.push({
      name: state,
      kind: known ?? "interaction",
      trigger: "TODO: the pseudo-class, or the prop and value, that sets this state",
      notes: known ? description : `TODO: confirm the ADR-025 kind. ${description}`,
    });
  }
}

let spec;
if (existing) {
  // Structure (parts, states, style rules) is authored once the spec exists; only report drift.
  const have = new Set(existing.anatomy.map((a) => a.name));
  const haveStates = new Set(existing.states.map((s) => s.name));
  const newParts = anatomy.filter((a) => !have.has(a.name)).map((a) => a.name);
  const newStates = statesOut.filter((s) => !haveStates.has(s.name)).map((s) => s.name);
  if (newParts.length) note(`code has parts the spec lacks (add them, or they share a class): ${newParts.join(", ")}`);
  if (newStates.length) note(`code has states the spec lacks: ${newStates.join(", ")}`);
  spec = { ...existing, props };
} else {
  spec = {
    component: name,
    anatomy,
    props,
    constraints: [],
    states: statesOut,
    accessibility: metadata.accessibility ?? {
      role: "TODO: the role the component exposes",
      ariaAttributes: [],
      keyboardInteractions: [],
    },
    styles,
    figma: { sets: [], divergences: [] },
  };
}

fs.writeFileSync(outFile, JSON.stringify(spec, null, 2) + "\n");

// The spec now owns states, tokens and accessibility (ADR-001 amendment 2026-10-11);
// metadata:validate rejects them in metadata once the spec exists. Removed line by
// line because a few metadata files are not in JSON.stringify's layout.
const stripped = [];
if (outFile === specFile && !existing) {
  const lines = fs.readFileSync(metaFile, "utf8").split("\n");
  for (const key of ["accessibility", "tokens", "states"]) {
    const start = lines.findIndex((l) => l.startsWith(`  "${key}":`));
    if (start === -1) continue;
    let end = start;
    if (!/[}\]],?$/.test(lines[start])) end = lines.findIndex((l, i) => i > start && /^ {2}[}\]],?$/.test(l));
    lines.splice(start, end - start + 1);
    stripped.push(key);
  }
  const last = lines.map((l) => l.trim()).lastIndexOf("}");
  const prev = last - 1;
  lines[prev] = lines[prev].replace(/,$/, "");
  fs.writeFileSync(metaFile, lines.join("\n"));
  JSON.parse(fs.readFileSync(metaFile, "utf8"));
}

const countTodos = (text) => (text.match(/TODO/g) ?? []).length;
const total = countTodos(JSON.stringify(spec));
console.log(`${path.relative(ROOT, outFile)}: ${Object.keys(props).length} props, ${anatomy.length} parts, ${Object.values(styles).flat().length} style rules, ${total} TODO(s)`);
for (const msg of todo) console.log(`  ! ${msg}`);
if (stripped.length) console.log(`  moved ${stripped.join(", ")} out of ${name}.metadata.json into the spec`);
if (total) console.log("  Fill every TODO (grep the file), then run: npm run tokens:build && npm run spec:validate");
