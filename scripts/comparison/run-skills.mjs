#!/usr/bin/env node
// Runs each competing skill from scripts/comparison/pins.json on the eight eval tasks, skill arm only,
// one run per task, through evals/run.sh. The bare arm and the product-engineer arm are not rerun: they
// are the published 17 October run.
//
//   node scripts/comparison/run-skills.mjs          # prints the plan and the estimated cost, runs nothing
//   node scripts/comparison/run-skills.mjs --yes    # spends the money
//
// Every run calls a model through the `claude` CLI and costs real money. Output goes to
// _upstream/results/<id>/ (gitignored); `node evals/comparison/skills.mjs --snapshot <id>` then copies
// the scorable files, without transcripts, into the repository.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPins } from "./fetch-upstream.mjs";
import { score } from "../../evals/score.mjs";
import { REFERENCE } from "../../evals/comparison/skills.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Mean cost of a skill-arm run in a results directory, from the meta.json files. */
export function meanSkillCost(dir) {
  const costs = score(dir)
    .filter((r) => r.condition === "skill")
    .map((r) => r.meta?.cost_usd)
    .filter((c) => typeof c === "number");
  if (!costs.length) throw new Error(`no cost recorded under ${dir}`);
  return costs.reduce((s, c) => s + c, 0) / costs.length;
}

/** Estimated dollars: the reference arm's mean cost times the number of runs. */
export function estimate({ meanCostUsd, tasks, rivals, runs = 1 }) {
  return Math.round(meanCostUsd * tasks * rivals * runs * 100) / 100;
}

/** Where a skill's directory is once fetch-upstream.mjs has run. */
export const skillDir = (s) => join(root, "_upstream", s.repo.split("/")[1], s.path);

export function main(argv) {
  const pins = readPins();
  const tasks = readdirSync(join(root, "evals", "tasks"), { withFileTypes: true }).filter((d) => d.isDirectory()).length;
  const mean = meanSkillCost(join(root, REFERENCE));
  const cost = estimate({ meanCostUsd: mean, tasks, rivals: pins.skills.length });
  console.log(`skills to run   ${pins.skills.map((s) => s.id).join(", ")}`);
  console.log(`runs            ${tasks * pins.skills.length} (${tasks} tasks, skill arm only, one run each)`);
  console.log(`estimated cost  about $${cost.toFixed(2)} (mean $${mean.toFixed(2)} per skill-arm run in ${REFERENCE})`);
  if (!argv.includes("--yes")) {
    console.log("Nothing has run. Add --yes to spend it.");
    return 1;
  }
  for (const s of pins.skills) {
    const r = spawnSync("sh", ["evals/run.sh", "", "skill", "--yes"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, PE_EVAL_SKILL_PATH: skillDir(s), PE_EVAL_SKILL_SOURCE: `${s.repo}@${s.commit.slice(0, 7)}`, PE_EVAL_OUT: join(root, "_upstream", "results", s.id) },
    });
    if (r.status !== 0) {
      console.error(`evals/run.sh failed for ${s.id}`);
      return 1;
    }
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
