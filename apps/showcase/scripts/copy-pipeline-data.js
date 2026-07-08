// Prebuild step: copies committed frozen snapshot files into src/data/ so the
// showcase app can `import` them like any other local module. This keeps
// Vite/tsc rootDir scoped to apps/showcase (no reaching outside the app root)
// while guaranteeing zero runtime fetches to GitHub/Airtable/Figma — the
// dashboard only ever reads what was already committed to git at build time.
// See .claude/handoff/archive/pipeline-dashboard.handoff.md (T2) and CLAUDE.md's
// "Frozen-memory snapshots" section.
//
// src/data/ is gitignored: it is a build artifact of copying already-committed
// source, not a second source of truth.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const outDir = join(__dirname, '..', 'src', 'data');

const sources = [
  { path: join(repoRoot, '.claude', 'component-pipeline.json'), out: 'component-pipeline.json' },
  { path: join(repoRoot, 'packages', 'tokens', 'airtable-governance.json'), out: 'airtable-governance.json' },
  { path: join(repoRoot, 'packages', 'tokens', 'token-usage.json'), out: 'token-usage.json' },
  { path: join(repoRoot, 'packages', 'tokens', 'figma-variables.json'), out: 'figma-variables.json' },
  { path: join(repoRoot, '.claude', 'pipeline-status.json'), out: 'pipeline-status.json' },
];

mkdirSync(outDir, { recursive: true });

for (const { path, out } of sources) {
  if (!existsSync(path)) {
    console.warn(`[copy-pipeline-data] skipping ${path} — not present yet`);
    continue;
  }
  copyFileSync(path, join(outDir, out));
  console.log(`[copy-pipeline-data] copied ${path} -> src/data/${out}`);
}
