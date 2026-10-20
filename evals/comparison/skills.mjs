#!/usr/bin/env node
// Turns eval runs into evals/comparison/skills-results.json, the input of render.mjs.
//
//   node evals/comparison/skills.mjs --snapshot <id>          # copy _upstream/results/<id> without transcripts
//   node evals/comparison/skills.mjs --collect --date YYYY-MM-DD   # count the arms and write skills-results.json
//
// A snapshot keeps the files evals/score.mjs reads (final.md, commit.txt, changed.txt, meta.json, exit.txt)
// and drops transcript.json and stderr.txt: a transcript contains the text of the skill the agent loaded,
// and one of the skills compared has no licence that lets this repository republish it.
// Node built-ins only.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { metrics, score } from "../score.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
export const OUT = join(here, "skills-results.json");
export const SNAPSHOTS = join(here, "results");
export const REFERENCE = "evals/results-2026-10-17/core";
const KEEP = ["final.md", "commit.txt", "changed.txt", "meta.json", "exit.txt"];

/** Copies the scorable files of every <task>/skill run from src to dest. Returns how many runs were copied. */
export function snapshot(src, dest) {
  let runs = 0;
  for (const task of readdirSync(src, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const from = join(src, task.name, "skill");
    if (!existsSync(from)) continue;
    const to = join(dest, task.name, "skill");
    mkdirSync(to, { recursive: true });
    for (const f of KEEP) if (existsSync(join(from, f))) copyFileSync(join(from, f), join(to, f));
    runs++;
  }
  return runs;
}

const meanCost = (rows) => {
  const costs = rows.map((r) => r.meta?.cost_usd).filter((c) => typeof c === "number");
  return costs.length ? Math.round((costs.reduce((s, c) => s + c, 0) / costs.length) * 10000) / 10000 : null;
};

function arm(id, label, rows, condition) {
  const mine = rows.filter((r) => r.condition === condition);
  const counts = Object.fromEntries(Object.keys(metrics).map((k) => [k, mine.filter((r) => r.results[k]).length]));
  const meta = mine.find((r) => r.meta?.requested_model)?.meta ?? {};
  return { id, label, n: mine.length, counts, meanCostUsd: meanCost(mine), model: meta.requested_model ?? null, cli: meta.cli ?? null, source: meta.source ?? null };
}

/** Counts per arm: the reference run's bare and core arms, then one arm per snapshot directory. */
export function collect({ referenceDir = join(root, REFERENCE), snapshotsDir = SNAPSHOTS, pins, date, ourVersion }) {
  const ref = score(referenceDir);
  const arms = [arm("bare", "bare (nothing installed)", ref, "bare"), arm("product-engineer", "product-engineer", ref, "skill")];
  const notRun = [];
  for (const s of pins.skills) {
    const dir = join(snapshotsDir, s.id);
    if (!existsSync(dir)) {
      notRun.push({ id: s.id, reason: "no paid run has been made yet" });
      continue;
    }
    arms.push(arm(s.id, `${s.name} (${s.licence})`, score(dir), "skill"));
  }
  const model = arms[0].model;
  return {
    runDate: date,
    ourVersion,
    reference: { dir: REFERENCE, model, cli: arms[0].cli },
    metrics: Object.entries(metrics).map(([key, m]) => ({ key, title: m.title })),
    arms,
    notRun,
  };
}

function main(argv) {
  const get = (name) => argv[argv.indexOf(name) + 1];
  if (argv.includes("--snapshot")) {
    const id = get("--snapshot");
    if (!/^[a-z0-9-]+$/.test(id ?? "")) { console.error("--snapshot needs a skill id from scripts/comparison/pins.json"); return 2; }
    const src = join(root, "_upstream", "results", id);
    if (!existsSync(src)) { console.error(`${src} does not exist; run scripts/comparison/run-skills.mjs first`); return 1; }
    console.log(`copied ${snapshot(src, join(SNAPSHOTS, id))} runs for ${id}`);
    return 0;
  }
  if (argv.includes("--collect")) {
    const date = get("--date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) { console.error("--date must be YYYY-MM-DD"); return 2; }
    const pins = JSON.parse(readFileSync(join(root, "scripts", "comparison", "pins.json"), "utf8"));
    const ourVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
    writeFileSync(OUT, `${JSON.stringify(collect({ pins, date, ourVersion }), null, 2)}\n`);
    console.log(`wrote ${OUT}`);
    return 0;
  }
  console.error("usage: node evals/comparison/skills.mjs --snapshot <id> | --collect --date YYYY-MM-DD");
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) process.exit(main(process.argv.slice(2)));
