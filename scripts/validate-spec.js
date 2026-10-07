#!/usr/bin/env node
// Validates every component spec (<Name>.spec.json, ADR-027) against
// component.spec.schema.json, then checks it against what was built so the
// spec cannot drift from the code:
//   - props: every prop the component and its parts declare (<Name>Props,
//     <Name><Part>Props) is in the spec and vice versa; variant-axis options
//     match the TypeScript union and the metadata axis; destructuring defaults
//     match.
//   - styles: the token paths in the spec equal the --ds-* custom properties
//     the CSS Module reads, and each one is defined in the built token CSS.
//   - states, constraints, anatomy: internal cross-references resolve; every
//     metadata state and composition.parts entry appears in the spec.
// Specs are optional during the ADR-027 pilot: only components with a spec file
// are checked. Requires built tokens (npm run tokens:build).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv/dist/2020.js";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PKG = path.resolve(ROOT, "packages/components");
const COMPONENTS_DIR = path.join(PKG, "src/components");
const SCHEMA_PATH = path.join(PKG, "component.spec.schema.json");
const TOKENS_CSS_DIR = path.resolve(ROOT, "packages/tokens/dist/css");

const validate = new Ajv({ allErrors: true, allowUnionTypes: true }).compile(JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8")));

const COMPONENT_NAMES = new Set(
  fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name),
);

const specs = [...COMPONENT_NAMES]
  .map((name) => ({ name, file: path.join(COMPONENTS_DIR, name, `${name}.spec.json`) }))
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

const tsconfig = ts.getParsedCommandLineOfConfigFile(path.join(PKG, "tsconfig.json"), {}, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: () => {},
});
const program = ts.createProgram(
  specs.map(({ name }) => path.join(COMPONENTS_DIR, name, "index.tsx")),
  { ...tsconfig.options, noEmit: true },
);
const checker = program.getTypeChecker();

const tokenToVar = (dotPath) => `--ds-${dotPath.replaceAll(".", "-")}`;

function tokenPaths(value) {
  if (typeof value === "string") return [value];
  if (value.template) return [...value.template.matchAll(/\{([a-z0-9.-]+)\}/g)].map((m) => m[1]);
  return [];
}

// Every props type in the component's file, keyed by spec prefix: "" for the
// preset's <Name>Props, "<Part>." for <Name><Part>Props. `all` includes
// inherited native attributes, `own` only props declared in the file, and
// `defaults` the literal destructuring defaults of the function taking it.
function readPropsTypes(name) {
  const source = program.getSourceFile(path.join(COMPONENTS_DIR, name, "index.tsx"));
  const pattern = new RegExp(`^${name}(\\w*)Props$`);
  const types = new Map();
  for (const alias of source.statements.filter((s) => ts.isTypeAliasDeclaration(s) && pattern.test(s.name.text))) {
    const part = alias.name.text.match(pattern)[1];
    types.set(part ? `${part}.` : "", { part, ...readProps(source, alias) });
  }
  return types;
}

function readProps(source, alias) {
  const all = new Map();
  const own = new Set();
  for (const symbol of checker.getPropertiesOfType(checker.getTypeAtLocation(alias.name))) {
    all.set(symbol.name, symbol);
    if (symbol.declarations?.some((d) => d.getSourceFile() === source)) own.add(symbol.name);
  }

  const defaults = new Map();
  const fn = source.statements.find((s) => {
    const type = ts.isFunctionDeclaration(s) && s.parameters[0]?.type;
    return type && ts.isTypeReferenceNode(type) && type.typeName.getText(source) === alias.name.text;
  });
  const binding = fn?.parameters[0]?.name;
  if (binding && ts.isObjectBindingPattern(binding)) {
    for (const el of binding.elements) {
      const init = el.initializer;
      if (!init) continue;
      const key = (el.propertyName ?? el.name).getText(source);
      if (ts.isStringLiteral(init)) defaults.set(key, init.text);
      else if (ts.isNumericLiteral(init)) defaults.set(key, Number(init.text));
      else if (init.kind === ts.SyntaxKind.TrueKeyword) defaults.set(key, true);
      else if (init.kind === ts.SyntaxKind.FalseKeyword) defaults.set(key, false);
    }
  }
  return { all, own, defaults };
}

function splitProp(key) {
  const dot = key.lastIndexOf(".");
  return dot === -1 ? ["", key] : [key.slice(0, dot + 1), key.slice(dot + 1)];
}

function stringLiterals(symbol) {
  const type = checker.getTypeOfSymbol(symbol);
  const members = type.isUnion() ? type.types : [type];
  return members.filter((t) => t.isStringLiteral()).map((t) => t.value).sort();
}

const sameSet = (a, b) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

let failures = 0;
const backlog = [];

for (const { name, file } of specs) {
  const rel = path.relative(ROOT, file);
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  const metadata = JSON.parse(fs.readFileSync(path.join(COMPONENTS_DIR, name, `${name}.metadata.json`), "utf8"));
  const errors = [];

  if (!validate(spec)) {
    for (const e of validate.errors) errors.push(`${e.instancePath || "/"} ${e.message}`);
    report(rel, errors);
    continue;
  }

  if (spec.component !== name) errors.push(`component "${spec.component}" does not match folder "${name}"`);

  // Anatomy, and the ADR-023 parts declared in metadata
  const partNames = spec.anatomy.map((p) => p.name);
  for (const dup of partNames.filter((n, i) => partNames.indexOf(n) !== i)) errors.push(`anatomy: duplicate part "${dup}"`);
  for (const part of spec.anatomy) {
    const at = `anatomy["${part.name}"]`;
    if (part.builtOn && !COMPONENT_NAMES.has(part.builtOn)) errors.push(`${at}.builtOn: "${part.builtOn}" is not a component`);
    if (part.parent && !partNames.includes(part.parent)) errors.push(`${at}.parent: "${part.parent}" is not an anatomy part`);
  }
  for (const part of metadata.composition?.parts ?? []) {
    const entry = spec.anatomy.find((p) => p.name === part.name);
    if (!entry) errors.push(`anatomy: metadata part "${part.name}" missing from the spec`);
    else if (part.builtOn && entry.builtOn !== part.builtOn) {
      errors.push(`anatomy["${part.name}"].builtOn "${entry.builtOn}" ≠ metadata "${part.builtOn}"`);
    }
  }

  // Props against the TypeScript props types and the metadata axes
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
      if (!sameSet(def.options, literals)) errors.push(`${at}.options [${def.options}] ≠ TypeScript [${literals}]`);
    }
    if (owner.defaults.has(prop) && owner.defaults.get(prop) !== def.default) {
      errors.push(`${at}.default ${JSON.stringify(def.default)} ≠ code default ${JSON.stringify(owner.defaults.get(prop))}`);
    }
    if (def.kind === "variantAxis") {
      const axis = metadata.variants?.[prop];
      if (!axis) errors.push(`${at}: variant axis "${prop}" missing from metadata variants`);
      else {
        if (!sameSet(def.options ?? [], axis.options)) errors.push(`${at}.options ≠ metadata variants.${prop}.options`);
        if ((def.default ?? null) !== axis.default) errors.push(`${at}.default ≠ metadata variants.${prop}.default`);
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

  // States
  const stateNames = new Set(spec.states.map((s) => s.name));
  for (const s of metadata.states ?? []) {
    if (!stateNames.has(s.state)) errors.push(`states: metadata state "${s.state}" missing from the spec`);
  }

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
      for (const value of Object.values(rule.set)) for (const t of tokenPaths(value)) specTokens.add(tokenToVar(t));
    }
  }
  const cssFile = path.join(COMPONENTS_DIR, name, `${name}.module.css`);
  const cssVars = new Set(
    fs.existsSync(cssFile) ? [...fs.readFileSync(cssFile, "utf8").matchAll(/var\((--ds-[a-z0-9-]+)/g)].map((m) => m[1]) : [],
  );
  for (const v of cssVars) if (!specTokens.has(v)) errors.push(`styles: CSS Module reads ${v} but the spec does not list it`);
  for (const v of specTokens) {
    if (!cssVars.has(v)) errors.push(`styles: spec lists ${v} but the CSS Module never reads it`);
    if (!definedVars.has(v)) errors.push(`styles: ${v} is not defined in the built token CSS`);
  }

  report(rel, errors);
}

function report(rel, errors) {
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

if (failures) {
  console.error(`\n${failures} spec file(s) failed validation.`);
  process.exit(1);
}
console.log(`\n✓ All ${specs.length} spec file(s) valid.`);
