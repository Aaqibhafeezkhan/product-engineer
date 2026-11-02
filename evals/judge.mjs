#!/usr/bin/env node
// Pairwise judge: for each task and run, shows a model the diff and the two commit
// messages (bare and skill) in a random order and asks which is truer to the diff and
// more useful to a non-engineer. Writes evals/results/judgements.json.
//
//   node evals/judge.mjs           # prints the pair count and the cost estimate, does nothing
//   node evals/judge.mjs --yes     # runs it; each call costs real tokens
//
// The judge is `claude -p` by default (PE_JUDGE_COMMAND overrides it, used by the tests).
import { realpathSync } from "node:fs";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const resultsRoot = join(here, "results");
const COST_PER_CALL_USD = 0.05;
const run = promisify(execFile);

export function prompt({ diff, a, b }) {
  return [
    "You are judging two commit messages written for the same change.",
    "Pick the one that is truer to the diff and more useful to a non-engineer who has to",
    "explain the change to a customer. Ignore length and formatting.",
    "",
    "Diff:",
    "```",
    diff,
    "```",
    "",
    "Message A:",
    "```",
    a,
    "```",
    "",
    "Message B:",
    "```",
    b,
    "```",
    "",
    "Answer with A or B and nothing else.",
  ].join("\n");
}

/** Runs the judge once. Returns { winner: "bare" | "skill", order: "bare,skill" | "skill,bare", answer }. */
export async function judgePair({ diff, bare, skill }, { command = "claude", random = Math.random } = {}) {
  const bareFirst = random() < 0.5;
  const order = bareFirst ? "bare,skill" : "skill,bare";
  const [a, b] = bareFirst ? [bare, skill] : [skill, bare];
  const args = command === "claude" ? ["-p", prompt({ diff, a, b }), "--output-format", "json"] : [prompt({ diff, a, b })];
  const { stdout } = await run(command, args, { maxBuffer: 1 << 24 });
  let answer = stdout.trim();
  try {
    const parsed = JSON.parse(stdout);
    if (typeof parsed.result === "string") answer = parsed.result.trim();
  } catch {}
  const letter = (answer.match(/\b([AB])\b/) ?? [])[1];
  if (!letter) throw new Error(`judge did not answer A or B: ${answer.slice(0, 80)}`);
  const winner = letter === "A" ? (bareFirst ? "bare" : "skill") : bareFirst ? "skill" : "bare";
  return { winner, order, answer: letter };
}

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

function runDirs(conditionDir) {
  const runs = readdirSync(conditionDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^run-\d+$/.test(d.name))
    .map((d) => ({ run: Number(d.name.slice(4)), dir: join(conditionDir, d.name) }));
  return runs.length ? runs : [{ run: 1, dir: conditionDir }];
}

/** Every (task, run) with a commit message in both arms. */
export function pairs(root = resultsRoot) {
  const out = [];
  for (const task of readdirSync(root).filter((t) => existsSync(join(root, t, "bare")) && existsSync(join(root, t, "skill"))).sort()) {
    const bareRuns = new Map(runDirs(join(root, task, "bare")).map((r) => [r.run, r.dir]));
    for (const { run, dir } of runDirs(join(root, task, "skill"))) {
      const bareDir = bareRuns.get(run);
      if (!bareDir) continue;
      const bare = read(join(bareDir, "commit.txt")).trim();
      const skill = read(join(dir, "commit.txt")).trim();
      if (!bare || !skill) continue;
      out.push({ task, run, diff: read(join(dir, "diff.txt")) || read(join(dir, "changed.txt")), bare, skill });
    }
  }
  return out;
}

async function main(argv) {
  const all = pairs();
  console.log(`${all.length} pairs, about $${(all.length * COST_PER_CALL_USD).toFixed(2)} at $${COST_PER_CALL_USD} per call`);
  if (!argv.includes("--yes")) {
    console.log("nothing run; pass --yes to judge them");
    return 0;
  }
  const command = process.env.PE_JUDGE_COMMAND || "claude";
  const judgements = [];
  for (const p of all) {
    const v = await judgePair(p, { command });
    judgements.push({ task: p.task, run: p.run, ...v });
    console.log(`${p.task} run ${p.run}: ${v.winner} (${v.order})`);
  }
  const wins = judgements.filter((j) => j.winner === "skill").length;
  writeFileSync(join(resultsRoot, "judgements.json"), JSON.stringify({ judgedAt: new Date().toISOString(), command, judgements }, null, 2) + "\n");
  console.log(`skill preferred in ${wins} of ${judgements.length}; written to evals/results/judgements.json`);
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.message); process.exit(1); });
}
