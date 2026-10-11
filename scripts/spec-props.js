// The TypeScript side of a component spec (ADR-027): the props each component
// and its parts declare, their destructuring defaults, and string-literal
// unions. Shared by validate-spec.js (checks a spec against it) and
// generate-spec.js (drafts a spec from it).
//
// `externalDir` checks components in a folder outside the repo tree (a harness
// run folder holding only the generated target). Repo components stay known
// names, and imports the folder can't resolve (../Icon) resolve from the repo
// tree.

import path from "path";
import ts from "typescript";
import { ROOT } from "./lib.js";

const PKG = path.resolve(ROOT, "packages/components");
const COMPONENTS_DIR = path.join(PKG, "src/components");

export function createPropsReader({ names, specDir = COMPONENTS_DIR, externalDir = null }) {
  const tsconfig = ts.getParsedCommandLineOfConfigFile(path.join(PKG, "tsconfig.json"), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => {},
  });
  const options = {
    ...tsconfig.options,
    noEmit: true,
    ...(externalDir && { paths: { "@upskill/components": [path.join(PKG, "src/index.ts")] } }),
  };
  const host = ts.createCompilerHost(options);
  if (externalDir) {
    host.resolveModuleNameLiterals = (literals, containingFile, _redirect, opts) =>
      literals.map((lit) => {
        const resolved = ts.resolveModuleName(lit.text, containingFile, opts, host);
        if (resolved.resolvedModule || !lit.text.startsWith("../") || !containingFile.startsWith(externalDir)) return resolved;
        return ts.resolveModuleName(lit.text, path.join(COMPONENTS_DIR, path.relative(externalDir, containingFile)), opts, host);
      });
  }
  const program = ts.createProgram(names.map((name) => path.join(specDir, name, "index.tsx")), options, host);
  const checker = program.getTypeChecker();

  // Every exported props type in the component's file, keyed by spec prefix: ""
  // for the preset's <Name>Props, "<Part>." for <Name><Part>Props (ADR-023 exports
  // part prop types; unexported helper types are ignored). `all` includes
  // inherited native attributes, `own` only props declared in the file, and
  // `defaults` the literal destructuring defaults of the function taking it.
  function readPropsTypes(name) {
    const source = program.getSourceFile(path.join(specDir, name, "index.tsx"));
    if (!source) return new Map();
    const pattern = new RegExp(`^${name}(\\w*)Props$`);
    const types = new Map();
    const exported = (s) => s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    for (const alias of source.statements.filter((s) => ts.isTypeAliasDeclaration(s) && exported(s) && pattern.test(s.name.text))) {
      const part = alias.name.text.match(pattern)[1];
      types.set(part ? `${part}.` : "", { part, ...readProps(source, alias) });
    }
    return types;
  }

  function readProps(source, alias) {
    const all = new Map();
    const own = new Set();
    const declared = new Map();
    for (const symbol of checker.getPropertiesOfType(checker.getTypeAtLocation(alias.name))) {
      all.set(symbol.name, symbol);
      const decls = (symbol.declarations ?? []).filter((d) => d.getSourceFile() === source);
      // A discriminated union declares a prop once per branch; `?: never` is the absent branch.
      const decl = decls.find((d) => d.type?.getText(source) !== "never") ?? decls[0];
      if (decl) {
        own.add(symbol.name);
        declared.set(symbol.name, { typeText: decl.type?.getText(source) ?? checker.typeToString(checker.getTypeOfSymbol(symbol)), optional: !!decl.questionToken });
      }
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
    return { all, own, declared, defaults };
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

  return { checker, readPropsTypes, stringLiterals, splitProp, program };
}
