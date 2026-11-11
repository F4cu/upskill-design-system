#!/usr/bin/env node
// Validates every component spec (<Name>.spec.json, ADR-027) against
// component.spec.schema.json, then checks it against what was built so the
// spec cannot drift from the code:
//   - props: every prop the component and its parts declare (<Name>Props,
//     <Name><Part>Props) is in the spec and vice versa; variant-axis options
//     match the TypeScript union and the usage.json axis; destructuring defaults
//     match.
//   - styles: the token paths in the spec equal the --ds-* custom properties
//     the CSS Module reads (plus any index.tsx reads, e.g. a size template), and each one is defined in the built token CSS.
//   - states, constraints, anatomy: internal cross-references resolve; every
//     composition.parts entry appears in the spec.
//   - anatomyExamples, decisions (ADR-030): example props are root spec props
//     with valid options, example patterns are usage.json composition.patterns names,
//     every builtOnPart is an anatomy part of the parent's builtOn component,
//     mark/focus name anatomy parts (all entries or none set mark; a part is
//     numbered once in the overview; focus is numbered in the overview and
//     its marks descend from it),
//     and every decision's adr has a file in docs/decisions/.
//   - vocabulary (ADR-025, ADR-026): prop names, boolean defaults, the
//     controlled triple and Figma names, via scripts/prop-vocabulary.js; a
//     waiver that no longer matches a violation fails too.
// A string or key starting with TODO (left by spec:generate) fails the check.
// Every component in the repo must have a spec (ADR-027); --components-dir checks only
// the specs it finds. Requires built tokens (npm run tokens:build).
//
// --components-dir <dir> checks the specs in <dir> instead (a harness run
// folder holding only the generated target). Repo components stay known names,
// and imports the folder can't resolve (../Icon) resolve from the repo tree.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv/dist/2020.js";
import { publicComponents, styleValueTokenPaths, componentTokenReads } from "./lib.js";
import { createPropsReader } from "./spec-props.js";
import { vocabularyErrors, staleWaivers, conceptRuleErrors } from "./prop-vocabulary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PKG = path.resolve(ROOT, "packages/components");
const COMPONENTS_DIR = path.join(PKG, "src/components");
const SCHEMA_PATH = path.join(PKG, "component.spec.schema.json");
const TOKENS_CSS_DIR = path.resolve(ROOT, "packages/tokens/dist/css");
const ADR_IDS = new Set(
  fs.readdirSync(path.resolve(ROOT, "docs/decisions")).flatMap((f) => (/^(\d{3})-.+\.md$/.exec(f) ? [`ADR-${f.slice(0, 3)}`] : [])),
);

const validate = new Ajv({ allErrors: true, allowUnionTypes: true }).compile(JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8")));

const dirFlag = process.argv.indexOf("--components-dir");
const EXTERNAL_DIR = dirFlag === -1 ? null : path.resolve(process.argv[dirFlag + 1]);
const SPEC_DIR = EXTERNAL_DIR ?? COMPONENTS_DIR;

const folders = (dir) => fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const COMPONENT_NAMES = new Set([...publicComponents(), ...(EXTERNAL_DIR ? folders(EXTERNAL_DIR) : [])]);

const missing = EXTERNAL_DIR
  ? []
  : folders(COMPONENTS_DIR).filter((name) => fs.existsSync(path.join(COMPONENTS_DIR, name, "index.tsx")) && !fs.existsSync(path.join(COMPONENTS_DIR, name, `${name}.spec.json`)));

const specs = folders(SPEC_DIR)
  .map((name) => ({ name, file: path.join(SPEC_DIR, name, `${name}.spec.json`) }))
  .filter(({ file }) => fs.existsSync(file));

if (!fs.existsSync(TOKENS_CSS_DIR)) {
  console.error("✗ packages/tokens/dist/css not found — run npm run tokens:build first.");
  process.exit(1);
}
const definedVars = new Set(
  fs
    .readdirSync(TOKENS_CSS_DIR)
    .filter((f) => f.endsWith(".css"))
    .flatMap((f) => [...fs.readFileSync(path.join(TOKENS_CSS_DIR, f), "utf8").matchAll(/(--ds-[a-z0-9-]+)\s*:/g)].map((m) => m[1])),
);

const { readPropsTypes, stringLiterals, splitProp } = createPropsReader({ names: specs.map(({ name }) => name), specDir: SPEC_DIR, externalDir: EXTERNAL_DIR });

const tokenToVar = (dotPath) => `--ds-${dotPath.replaceAll(".", "-")}`;

const sameSet = (a, b) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

let failures = 0;
for (const name of missing) {
  console.error(`✗ packages/components/src/components/${name}/${name}.spec.json — missing; run npm run spec:generate -- ${name}`);
  failures++;
}
const backlog = [];

for (const { name, file } of specs) {
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  const errors = [];
  const metadataFile = path.join(SPEC_DIR, name, `${name}.usage.json`);
  let metadata = {};
  if (fs.existsSync(metadataFile)) metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  else errors.push(`${name}.usage.json not found`);
  if (!fs.existsSync(path.join(SPEC_DIR, name, "index.tsx"))) errors.push("index.tsx not found");

  if (!validate(spec)) {
    for (const e of validate.errors) {
      const at = e.instancePath || "/";
      if (at.endsWith("/concept")) {
        if (e.keyword === "anyOf") errors.push(`${at} must be an ADR-026 concept from the spec schema's enum, "native", or "new term: <reason>"`);
        continue;
      }
      errors.push(`${at} ${e.message}`);
    }
    report(file, errors);
    continue;
  }

  const todos = [];
  JSON.stringify(spec, (key, value) => {
    if (typeof value === "string" && value.startsWith("TODO")) todos.push(value);
    if (key.startsWith("TODO")) todos.push(key);
    return value;
  });
  if (todos.length) errors.push(`${todos.length} unfilled TODO(s) from spec:generate, first: "${todos[0].slice(0, 90)}"`);

  if (spec.component !== name) errors.push(`component "${spec.component}" does not match folder "${name}"`);

  // Anatomy, and the ADR-023 parts declared in usage.json
  const partNames = spec.anatomy.map((p) => p.name);
  for (const dup of partNames.filter((n, i) => partNames.indexOf(n) !== i)) errors.push(`anatomy: duplicate part "${dup}"`);
  for (const part of spec.anatomy) {
    const at = `anatomy["${part.name}"]`;
    if (part.builtOn && !COMPONENT_NAMES.has(part.builtOn)) errors.push(`${at}.builtOn: "${part.builtOn}" is not a component`);
    if (part.parent && !partNames.includes(part.parent)) errors.push(`${at}.parent: "${part.parent}" is not an anatomy part`);
    if (part.builtOnPart) {
      const host = spec.anatomy.find((p) => p.name === part.parent)?.builtOn;
      const hostSpec = host && path.join(COMPONENTS_DIR, host, `${host}.spec.json`);
      if (!host) errors.push(`${at}.builtOnPart: the parent part has no builtOn component`);
      else if (!JSON.parse(fs.readFileSync(hostSpec, "utf8")).anatomy.some((p) => p.name === part.builtOnPart)) {
        errors.push(`${at}.builtOnPart: "${part.builtOnPart}" is not an anatomy part of ${host}`);
      }
    }
  }
  for (const part of metadata.composition?.parts ?? []) {
    const entry = spec.anatomy.find((p) => p.name === part.name);
    if (!entry) errors.push(`anatomy: usage.json part "${part.name}" missing from the spec`);
    else if (part.builtOn && entry.builtOn !== part.builtOn) {
      errors.push(`anatomy["${part.name}"].builtOn "${entry.builtOn}" ≠ usage.json "${part.builtOn}"`);
    }
  }

  // Props against the TypeScript props types and the usage.json axes
  const propsTypes = readPropsTypes(name);
  if (!propsTypes.has("")) errors.push(`index.tsx declares no ${name}Props type alias`);
  for (const [prefix, { part, own }] of propsTypes) {
    if (part && !partNames.includes(part)) errors.push(`anatomy: ${name}${part}Props has no "${part}" part`);
    for (const prop of own) {
      if (!spec.props[prefix + prop]) errors.push(`props: "${prefix + prop}" is declared in ${name}${part}Props but missing from the spec`);
    }
  }
  for (const [key, def] of Object.entries(spec.props)) {
    const at = `props["${key}"]`;
    if (def.figma.surface === "figma-only") continue;
    const [prefix, prop] = splitProp(key);
    const owner = propsTypes.get(prefix);
    if (!owner?.all.has(prop)) {
      errors.push(`${at}: not a prop of ${name}${prefix.slice(0, -1)}Props`);
      continue;
    }
    if (def.kind !== "native" && !owner.own.has(prop)) {
      errors.push(`${at}: kind "${def.kind}" but the prop is inherited, not declared by ${name}`);
    }
    if (def.options) {
      const literals = stringLiterals(owner.all.get(prop));
      if (literals.length && !sameSet(def.options, literals)) errors.push(`${at}.options [${def.options}] ≠ TypeScript [${literals}]`);
    }
    if (owner.defaults.has(prop) && owner.defaults.get(prop) !== def.default) {
      errors.push(`${at}.default ${JSON.stringify(def.default)} ≠ code default ${JSON.stringify(owner.defaults.get(prop))}`);
    }
    if (def.kind === "variantAxis") {
      const axis = metadata.variants?.[prop];
      if (!axis) errors.push(`${at}: variant axis "${prop}" missing from usage.json variants`);
      else {
        if (!sameSet(def.options ?? [], axis.options)) errors.push(`${at}.options ≠ usage.json variants.${prop}.options`);
        if ((def.default ?? null) !== axis.default) errors.push(`${at}.default ≠ usage.json variants.${prop}.default`);
      }
    }
  }

  // Constraints
  for (const c of spec.constraints ?? []) {
    const refs = [...Object.keys(c.if), ...(c.require ?? []), ...(c.ignore ?? []), ...Object.keys(c.forbid ?? {})];
    for (const ref of refs) {
      if (!spec.props[ref]) errors.push(`constraints["${c.id}"]: "${ref}" is not a spec prop`);
    }
    if (!c.enforcedBy.length) backlog.push(`${name}: constraint "${c.id}" is documented only (enforcedBy is empty)`);
  }

  // Anatomy examples and decisions (ADR-030)
  const patternNames = new Set((metadata.composition?.patterns ?? []).map((p) => p.name));
  spec.anatomyExamples?.forEach((example, i) => {
    const at = `anatomyExamples[${i}]`;
    if (example.pattern && !patternNames.has(example.pattern)) errors.push(`${at}.pattern: "${example.pattern}" is not a usage.json composition.patterns name`);
    for (const [prop, value] of Object.entries(example.props ?? {})) {
      const def = spec.props[prop];
      if (!def || prop.includes(".") || def.figma.surface === "figma-only") errors.push(`${at}.props: "${prop}" is not a root code prop in the spec`);
      else if (def.options && !def.options.includes(value)) errors.push(`${at}.props.${prop}: "${value}" is not an option`);
    }
  });
  const examples = spec.anatomyExamples ?? [];
  if (examples.some((e) => e.mark)) {
    const parentOf = new Map(spec.anatomy.map((p) => [p.name, p.parent]));
    const descends = (n, ancestor) => { for (let p = parentOf.get(n); p; p = parentOf.get(p)) if (p === ancestor) return true; return false; };
    const overview = new Set();
    examples.forEach((e, i) => {
      const at = `anatomyExamples[${i}]`;
      if (!e.mark) return errors.push(`${at}: mark is required once any entry sets it`);
      for (const n of [...e.mark, ...(e.focus ? [e.focus] : [])]) if (!partNames.includes(n)) errors.push(`${at}: "${n}" is not an anatomy part`);
      if (e.focus) { for (const n of e.mark) if (!descends(n, e.focus)) errors.push(`${at}.mark: "${n}" is not inside focus "${e.focus}"`); return; }
      for (const n of e.mark) { if (overview.has(n)) errors.push(`${at}.mark: "${n}" is already numbered by an earlier example`); overview.add(n); }
    });
    examples.forEach((e, i) => { if (e.focus && !overview.has(e.focus)) errors.push(`anatomyExamples[${i}].focus: "${e.focus}" is not marked in an unfocused example`); });
  }
  for (const d of spec.decisions ?? []) {
    if (d.adr && !ADR_IDS.has(d.adr)) errors.push(`decisions: ${d.adr} has no file in docs/decisions/`);
  }

  // States
  const stateNames = new Set(spec.states.map((s) => s.name));

  // Styles against the CSS Module
  const specTokens = new Set();
  for (const [part, rules] of Object.entries(spec.styles)) {
    if (!partNames.includes(part)) errors.push(`styles["${part}"]: not an anatomy part`);
    for (const rule of rules) {
      for (const [key, value] of Object.entries(rule.when)) {
        if (key === "state") {
          if (!stateNames.has(value)) errors.push(`styles["${part}"]: state "${value}" not in spec states`);
        } else if (!spec.props[key]) {
          errors.push(`styles["${part}"]: when.${key} is not a spec prop`);
        } else if (value !== "*" && spec.props[key].options && !spec.props[key].options.includes(value)) {
          errors.push(`styles["${part}"]: when.${key}="${value}" is not an option`);
        }
      }
      for (const value of Object.values(rule.set)) for (const t of styleValueTokenPaths(value)) specTokens.add(tokenToVar(t));
    }
  }
  const cssFile = path.join(SPEC_DIR, name, `${name}.module.css`);
  const cssVars = new Set(
    fs.existsSync(cssFile) ? [...fs.readFileSync(cssFile, "utf8").matchAll(/var\((--ds-[a-z0-9-]+)/g)].map((m) => m[1]) : [],
  );
  // index.tsx may also read tokens, e.g. var(--ds-size-avatar-${size}) set as an inline custom property.
  const { tsxVars, tsxPrefixes } = componentTokenReads(path.join(SPEC_DIR, name));
  const readInTsx = (v) => tsxVars.has(v) || tsxPrefixes.some((p) => v.startsWith(p));
  for (const v of cssVars) if (!specTokens.has(v)) errors.push(`styles: CSS Module reads ${v} but the spec does not list it`);
  for (const v of specTokens) {
    if (!cssVars.has(v) && !readInTsx(v)) errors.push(`styles: spec lists ${v} but neither the CSS Module nor index.tsx reads it`);
    if (!definedVars.has(v)) errors.push(`styles: ${v} is not defined in the built token CSS`);
  }

  errors.push(...vocabularyErrors(name, spec));
  report(file, errors);
}

function report(file, errors) {
  const rel = path.relative(ROOT, file);
  if (errors.length) {
    console.error(`✗ ${rel}`);
    for (const msg of errors) console.error(`    ${msg}`);
    failures++;
  } else {
    console.log(`✓ ${rel}`);
  }
}

if (backlog.length) {
  console.log("\nUnenforced constraints (backlog, not failures):");
  for (const line of backlog) console.log(`  · ${line}`);
}

if (!EXTERNAL_DIR) {
  for (const id of staleWaivers()) {
    console.error(`✗ scripts/prop-vocabulary-waivers.json — "${id}" no longer matches a violation; delete it`);
    failures++;
  }
}
for (const msg of conceptRuleErrors()) {
  console.error(`✗ scripts/prop-vocabulary.js — ${msg}`);
  failures++;
}

if (failures) {
  console.error(`\n${failures} spec file(s) failed validation.`);
  process.exit(1);
}
console.log(`\n✓ All ${specs.length} spec file(s) valid.`);
