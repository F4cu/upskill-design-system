#!/usr/bin/env node
// Captures a frozen snapshot of CI workflow status + open issues → .claude/pipeline-status.json.
// Plain Node, direct REST via `gh api` (already authenticated) — same conventions as
// airtable-pull.js. Run manually before deploy, never in a loop, never at app runtime.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, "../.claude/pipeline-status.json");

const REPO = "F4cu/upskill-design-system";

const WORKFLOWS = {
  "tokens-check": "tokens-check.yml",
  "components-check": "components-check.yml",
  "sync-tokens": "sync-tokens.yml",
};

function ghApi(endpoint) {
  const out = execFileSync("gh", ["api", endpoint], { encoding: "utf8" });
  return JSON.parse(out);
}

function latestRunOnMain(workflowFile) {
  const data = ghApi(
    `repos/${REPO}/actions/workflows/${workflowFile}/runs?branch=main&per_page=1`
  );
  const run = data.workflow_runs?.[0];
  if (!run) return null;
  return {
    conclusion: run.conclusion,
    updatedAt: run.updated_at,
    htmlUrl: run.html_url,
  };
}

function openIssues() {
  const data = ghApi(`repos/${REPO}/issues?state=open&per_page=100`);
  return data
    .filter((item) => !item.pull_request)
    .map((item) => ({
      number: item.number,
      title: item.title,
      labels: (item.labels ?? []).map((l) => (typeof l === "string" ? l : l.name)),
      htmlUrl: item.html_url,
    }));
}

function main() {
  const workflows = {};
  for (const [key, file] of Object.entries(WORKFLOWS)) {
    console.log(`Fetching latest "main" run for ${file}…`);
    workflows[key] = latestRunOnMain(file);
  }

  console.log("Fetching open issues…");
  const issues = openIssues();
  console.log(`  ${issues.length} open issue(s)`);

  const snapshot = {
    capturedAt: new Date().toISOString(),
    workflows,
    issues,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`\nWrote .claude/pipeline-status.json.`);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
