#!/usr/bin/env node
// Captures the Figma example frames (ADR-023 amendment 2026-10-06) into
// packages/components/figma-pattern-frames.json, the frozen snapshot that
// usage:validate compares against composition.patterns.
//
// Interactive only: it drives Figma Desktop through figma-cli, so it runs on a
// developer machine with the file open, never in CI or an npm script.
// Usage: FIGMA_FILE="Upskill - Design System" node scripts/capture-pattern-frames.js
//
// A pattern frame is a FRAME inside any section named "… examples" whose first
// child is a text layer reading the frame's own name (the pattern id label).
// Section names don't identify the owner (card-carousel belongs to
// CardVertical, page-landmarks to Box), so frames are matched by id alone.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../packages/components/figma-pattern-frames.json");

const EVAL = `
await figma.loadAllPagesAsync();
const frames = [];
for (const page of figma.root.children) {
  const sections = page.findAllWithCriteria({ types: ["SECTION"] }).filter((s) => / examples$/i.test(s.name));
  for (const section of sections) {
    const found = section.findAllWithCriteria({ types: ["FRAME"] }).filter((f) => {
      const first = f.children[0];
      return first && first.type === "TEXT" && first.characters === f.name;
    });
    for (const f of found) frames.push({ pattern: f.name, section: section.name, page: page.name, nodeId: f.id });
  }
}
return { fileKey: figma.fileKey, fileName: figma.root.name, frames };
`;

const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pattern-frames-")), "capture.js");
fs.writeFileSync(tmp, EVAL);
const raw = execFileSync("figma-cli", ["eval", "--file", tmp], { encoding: "utf8", timeout: 90_000 });
const result = JSON.parse(raw.slice(raw.indexOf("{")));

result.frames.sort((a, b) => a.pattern.localeCompare(b.pattern) || a.nodeId.localeCompare(b.nodeId));
const snapshot = {
  $comment:
    "Frozen list of the Figma pattern example frames (ADR-023). Captured interactively by scripts/capture-pattern-frames.js via figma-cli; never regenerated in CI. usage:validate checks it against composition.patterns.",
  fileKey: result.fileKey,
  fileName: result.fileName,
  capturedAt: new Date().toISOString().slice(0, 10),
  frames: result.frames,
};
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`✓ ${result.frames.length} pattern frames from "${result.fileName}" → ${path.relative(process.cwd(), OUT)}`);
