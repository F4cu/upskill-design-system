#!/usr/bin/env node
// Deterministic AST + metadata scan of packages/components/src → .claude/component-patterns.json,
// the single cross-component pattern aggregate (read in-context, never re-scanned downstream).
// Uses the TypeScript compiler API (already a workspace dependency via packages/components) —
// per-file syntax walks suffice since the library has no cross-file symbol resolution to do.
//
// Bucketing rules — first structural match wins, in this order; the last two fall back to a
// metadata hint (component.category / component.type) because structure alone can't separate
// a layout primitive from a display atom:
//   1. controlled-selection  role/option wiring (combobox|listbox|menu|option|menuitem) or aria-selected
//   2. disclosure            aria-expanded + aria-controls + a boolean open state
//   3. navigation            renders a <nav> landmark
//   4. status-indicator      role="progressbar" or aria-valuenow
//   5. toggle-button         aria-pressed
//   6. form-field            <label htmlFor> paired with a native input/select/textarea
//   7. action-trigger        renders <button> or <a>, metadata component.type === "interactive"
//   8. layout-primitive      metadata hint: component.category === "layout"
//   9. static-display        everything else
// Hook-based patterns (src/hooks/) form the content-stepper bucket, keyed by hook not component.
//
// ariaContract is derived only from JSX attributes actually present (role / aria-* / id);
// metadata accessibility strings are quoted verbatim into systemSpecificNotes, never restructured.
// idsFromUseId lists variables reachable from a useId() call (one fixpoint pass over variable
// initializers), so {panelId}-style attribute values are traceable to useId pairing.

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.resolve(ROOT, "packages/components/src/components");
const HOOKS_DIR = path.resolve(ROOT, "packages/components/src/hooks");
const PIPELINE_PATH = path.resolve(ROOT, ".claude/component-pipeline.json");
const OUTPUT_PATH = path.resolve(ROOT, ".claude/component-patterns.json");

const SELECTION_ROLES = ["combobox", "listbox", "menu", "menuitem", "option"];

const PATTERN_DESCRIPTIONS = {
  "controlled-selection":
    "A trigger or list managing a selected value among options (combobox/listbox/menu roles, aria-selected).",
  disclosure:
    "A trigger toggling the visibility of an associated panel (aria-expanded + aria-controls, boolean open state).",
  navigation: "A <nav> landmark containing links, with aria-current marking the active item.",
  "status-indicator": "A read-only value display using ARIA value semantics.",
  "toggle-button": "A pressable button holding a boolean pressed state (aria-pressed).",
  "form-field": "A labeled native form control (label[htmlFor] + input/select), errors via role=alert.",
  "action-trigger": "A stateless clickable control (button or anchor) firing a native event.",
  "content-stepper":
    "Hook-managed step-through state for slider/carousel UIs; the caller owns the DOM contract.",
  "layout-primitive": "A structural container with no interaction or ARIA surface of its own.",
  "static-display": "A presentational component rendering provided content, no managed state.",
};

function parseFile(filePath) {
  return ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
}

function collectProps(sf) {
  const props = new Set();
  const nativeSpreads = [];
  sf.forEachChild(function visit(node) {
    if (ts.isTypeAliasDeclaration(node) && /Props$/.test(node.name.text)) {
      const parts = ts.isIntersectionTypeNode(node.type) ? node.type.types : [node.type];
      for (const part of parts) {
        if (ts.isTypeLiteralNode(part)) {
          for (const member of part.members) {
            if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
              props.add(member.name.text);
            }
          }
        } else {
          nativeSpreads.push(part.getText(sf).replace(/\s+/g, " "));
        }
      }
    }
    node.forEachChild(visit);
  });
  return { props, nativeSpreads };
}

function collectImportedComponents(sf) {
  const names = new Set();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    const spec = stmt.moduleSpecifier.text;
    if (!spec.startsWith("../") || spec.includes(".module.css") || spec.includes("/styles/")) continue;
    const clause = stmt.importClause;
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const el of clause.namedBindings.elements) {
        if (/^[A-Z]/.test(el.name.text)) names.add(el.name.text);
      }
    }
  }
  return names;
}

function collectUseIdVars(sf) {
  const vars = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    sf.forEachChild(function visit(node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const init = node.initializer.getText(sf);
        const reachesUseId =
          /\buseId\s*\(/.test(init) || [...vars].some((v) => new RegExp(`\\b${v}\\b`).test(init));
        if (reachesUseId && !vars.has(node.name.text)) {
          vars.add(node.name.text);
          grew = true;
        }
      }
      node.forEachChild(visit);
    });
  }
  return vars;
}

function attrValueText(attr, sf) {
  if (!attr.initializer) return "true";
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  return `{${attr.initializer.expression.getText(sf).replace(/\s+/g, " ")}}`;
}

function scanJsx(sf) {
  const ariaNodes = [];
  const renderedTags = new Set();
  const usedJsxNames = new Set();
  let hasLabelFor = false;

  sf.forEachChild(function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      if (/^[a-z]/.test(tag)) renderedTags.add(tag);
      else usedJsxNames.add(tag);

      const attrs = {};
      let hasAriaOrRole = false;
      let asValue;
      let hasHtmlFor = false;
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr)) continue;
        const name = attr.name.getText(sf);
        if (name === "role" || name.startsWith("aria-") || name === "id") {
          attrs[name] = attrValueText(attr, sf);
          if (name !== "id") hasAriaOrRole = true;
        }
        if (name === "as") asValue = attrValueText(attr, sf);
        if (name === "htmlFor") hasHtmlFor = true;
      }
      // Labels render through <Text as="label" htmlFor> (CLAUDE.md typography
      // rule), so a polymorphic as="label" counts the same as a native <label>.
      if (hasHtmlFor && (tag === "label" || asValue === "label")) hasLabelFor = true;
      if (hasAriaOrRole) ariaNodes.push({ element: tag, ...attrs });
    }
    node.forEachChild(visit);
  });

  return { ariaNodes, renderedTags, usedJsxNames, hasLabelFor };
}

function detectControlledPair(props) {
  for (const p of props) {
    const cap = p[0].toUpperCase() + p.slice(1);
    if (props.has(`default${cap}`) && props.has(`on${cap}Change`)) {
      return [p, `default${cap}`, `on${cap}Change`];
    }
  }
  return null;
}

function ariaText(ariaNodes) {
  return ariaNodes.map((n) => JSON.stringify(n)).join("\n");
}

function bucketComponent(c) {
  const aria = ariaText(c.ariaNodes);
  const roleValues = c.ariaNodes.map((n) => n.role ?? "").join(" ");
  if (SELECTION_ROLES.some((r) => roleValues.includes(r)) || aria.includes("aria-selected"))
    return "controlled-selection";
  if (aria.includes("aria-expanded") && aria.includes("aria-controls") && (c.controlledPair || c.usesUseState))
    return "disclosure";
  if (c.renderedTags.has("nav")) return "navigation";
  if (roleValues.includes("progressbar") || aria.includes("aria-valuenow")) return "status-indicator";
  if (aria.includes("aria-pressed")) return "toggle-button";
  if (c.hasLabelFor && ["input", "select", "textarea"].some((t) => c.renderedTags.has(t)))
    return "form-field";
  if ((c.renderedTags.has("button") || c.renderedTags.has("a")) && c.metadata.component.type === "interactive")
    return "action-trigger";
  if (c.metadata.component.category === "layout") return "layout-primitive";
  return "static-display";
}

function scanComponent(name) {
  const dir = path.join(COMPONENTS_DIR, name);
  const sf = parseFile(path.join(dir, "index.tsx"));
  const src = sf.getFullText();
  const metadata = JSON.parse(fs.readFileSync(path.join(dir, `${name}.metadata.json`), "utf8"));

  const { props, nativeSpreads } = collectProps(sf);
  const imported = collectImportedComponents(sf);
  const { ariaNodes, renderedTags, usedJsxNames, hasLabelFor } = scanJsx(sf);
  const composition = [...imported].filter((n) => usedJsxNames.has(n)).sort();
  const useIdVars = collectUseIdVars(sf);

  const controlledPair = detectControlledPair(props);
  const usesUseState = /\buseState\b/.test(src);
  const hasControlledBranch = /isControlled|!==\s*undefined/.test(src);

  let state = null;
  if (controlledPair) {
    state = {
      controlled: usesUseState && hasControlledBranch ? "optional" : "always",
      props: controlledPair,
    };
  } else if (props.has("onSelect")) {
    const stateProp = [...props].find((p) => /^selected/.test(p) || p === "value");
    state = { controlled: "always", props: [stateProp, "onSelect"].filter(Boolean).sort() };
  }

  let changeCallback = null;
  if (controlledPair) changeCallback = controlledPair[2];
  else if (props.has("onSelect")) changeCallback = "onSelect";
  else {
    const inputSpread = nativeSpreads.find((s) => /InputHTMLAttributes/.test(s));
    if (inputSpread && !/['"]onChange['"]/.test(inputSpread)) changeCallback = "onChange (native)";
  }

  const notes = [];
  if (metadata.accessibility?.notes) notes.push(metadata.accessibility.notes);
  for (const s of metadata.accessibility?.ariaAttributes ?? []) notes.push(s);

  return {
    name,
    metadata,
    composition,
    ariaNodes,
    renderedTags,
    hasLabelFor,
    controlledPair,
    usesUseState,
    state,
    changeCallback,
    idsFromUseId: [...useIdVars].sort(),
    systemSpecificNotes: notes,
  };
}

function scanHook(fileName) {
  const hookName = fileName.replace(/\.ts$/, "");
  const sf = parseFile(path.join(HOOKS_DIR, fileName));
  let params = [];
  let returns = [];
  sf.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === hookName) {
      params = node.parameters.map((p) => p.getText(sf).replace(/\s+/g, " "));
    }
    if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
      returns = node.type.members
        .filter((m) => ts.isPropertySignature(m) && m.name)
        .map((m) => m.name.getText(sf));
    }
  });

  const consumers = [];
  const scanDirs = [path.resolve(ROOT, "packages/components/src"), path.resolve(ROOT, "apps")];
  for (const dir of scanDirs) {
    for (const file of walkFiles(dir, new Set([".ts", ".tsx"]))) {
      const rel = path.relative(ROOT, file);
      if (file.startsWith(HOOKS_DIR) || rel === "packages/components/src/index.ts") continue;
      if (new RegExp(`\\b${hookName}\\b`).test(fs.readFileSync(file, "utf8"))) consumers.push(rel);
    }
  }
  return { hook: hookName, params, returns, consumers: consumers.sort() };
}

function walkFiles(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      out.push(...walkFiles(full, exts));
    } else if (exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function detectDrift(components) {
  const drift = [];

  const callbackUsers = components.filter((c) => c.changeCallback);
  const callbackNames = new Set(callbackUsers.map((c) => c.changeCallback));
  if (callbackNames.size > 1) {
    drift.push({
      pattern: "change-callback",
      issue: "prop-name-mismatch",
      detail: callbackUsers
        .map((c) => `${c.name} uses \`${c.changeCallback}\``)
        .join(", ") + " — different names for the same state-changed axis.",
      components: callbackUsers.map((c) => c.name).sort(),
    });
  }

  const selectionStateful = components.filter(
    (c) => c.bucket === "controlled-selection" && c.state
  );
  const stateProps = new Set(
    selectionStateful.map((c) => c.state.props.find((p) => !/^on[A-Z]/.test(p)))
  );
  if (stateProps.size > 1) {
    drift.push({
      pattern: "controlled-selection",
      issue: "state-prop-name-mismatch",
      detail: selectionStateful
        .map((c) => `${c.name} uses \`${c.state.props.find((p) => !/^on[A-Z]/.test(p))}\``)
        .join(", ") + " — different names for the selected-value prop.",
      components: selectionStateful.map((c) => c.name).sort(),
    });
  }

  for (const c of components) {
    const declared = (c.metadata.composition?.composedOf ?? []).slice().sort();
    if (JSON.stringify(declared) !== JSON.stringify(c.composition)) {
      drift.push({
        pattern: c.bucket,
        issue: "composition-metadata-mismatch",
        detail: `${c.name} JSX uses [${c.composition.join(", ")}] but metadata composition.composedOf declares [${declared.join(", ")}].`,
        components: [c.name],
      });
    }
  }

  return drift;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeysDeep(value[k])])
    );
  }
  return value;
}

function main() {
  const pipeline = JSON.parse(fs.readFileSync(PIPELINE_PATH, "utf8"));
  const stageByName = Object.fromEntries(pipeline.components.map((c) => [c.name, c.implementation]));

  const names = fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const components = names.map(scanComponent);
  for (const c of components) c.bucket = bucketComponent(c);

  const patterns = {};
  for (const c of components) {
    const entry = {
      component: c.name,
      maturity: c.metadata.component.status,
      stage: stageByName[c.name] ?? null,
      composition: c.composition,
    };
    if (c.state) entry.state = c.state;
    if (c.changeCallback) entry.changeCallback = c.changeCallback;
    if (c.ariaNodes.length) entry.ariaContract = c.ariaNodes;
    if (c.idsFromUseId.length) entry.idsFromUseId = c.idsFromUseId;
    if (c.systemSpecificNotes.length) entry.systemSpecificNotes = c.systemSpecificNotes;

    (patterns[c.bucket] ??= {
      description: PATTERN_DESCRIPTIONS[c.bucket],
      architecturalStyle: "flat-props",
      implementedBy: [],
    }).implementedBy.push(entry);
  }

  patterns["content-stepper"] = {
    description: PATTERN_DESCRIPTIONS["content-stepper"],
    architecturalStyle: "hook",
    implementedBy: fs
      .readdirSync(HOOKS_DIR)
      .filter((f) => f.endsWith(".ts"))
      .sort()
      .map(scanHook),
  };

  const output = {
    generatedFrom: execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim(),
    architecturalStyle:
      "flat-props: no compound components, no createContext, no static sub-component assignment; all components are plain named exports in packages/components/src/components/<Name>/index.tsx",
    patterns,
    drift: detectDrift(components),
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sortKeysDeep(output), null, 2) + "\n");

  const total = Object.values(patterns).reduce((n, p) => n + p.implementedBy.length, 0);
  console.log(`Patterns: ${Object.keys(patterns).length}`);
  console.log(`Implementers: ${total} (${components.length} components + hooks)`);
  console.log(`Drift entries: ${output.drift.length}`);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
