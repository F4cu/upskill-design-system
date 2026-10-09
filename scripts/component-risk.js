#!/usr/bin/env node
// Prints a component's review-risk tier for /add-component Stage 3 (ADR-029,
// ADR-007 amendment): `interactive` spawns the adversarial reviewer, `display`
// takes the in-session /code-review path. Same derivation as the Tier-2 a11y
// gate, so a component that owes an a11y test also gets the reviewer.
//
// Usage: npm run component:risk -- <Name>

import fs from "fs";
import path from "path";
import { ROOT, readJson, isInteractive } from "./lib.js";

const name = process.argv[2];
if (!name) {
  console.error("Usage: npm run component:risk -- <Name>");
  process.exit(2);
}

const metaFile = path.join(ROOT, "packages/components/src/components", name, `${name}.metadata.json`);
if (!fs.existsSync(metaFile)) {
  console.error(`No metadata at ${path.relative(ROOT, metaFile)} — scaffold the component first.`);
  process.exit(2);
}

console.log(isInteractive(readJson(metaFile)) ? "interactive" : "display");
