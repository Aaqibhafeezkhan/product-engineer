#!/usr/bin/env node
// Does the skill arm look like it loaded the skill? The transcripts keep only the final result and the
// token usage, not the tool calls, so loading cannot be read directly. A skill that is loaded costs a
// tool call (one more turn) and its body (more cached input tokens). This compares each skill-arm run
// with the mean of the bare runs of the same task and prints, for runs with and without the block in
// the commit, the mean extra turns and the mean extra cache-creation tokens.
//
//   node evals/skill-load-signal.mjs evals/results-claude-sonnet-5-5-2026-10-20 [more results dirs]
//
// An inference from cost, not an observation: it says which hypothesis the data fits, not which is true.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const runs = (dir) => (existsSync(dir) ? readdirSync(dir).filter((x) => /^run-\d+$/.test(x)).map((x) => join(dir, x)) : []);
const load = (dir) => {
  const j = JSON.parse(readFileSync(join(dir, "transcript.json"), "utf8"));
  const commit = existsSync(join(dir, "commit.txt")) ? readFileSync(join(dir, "commit.txt"), "utf8") : "";
  return { turns: j.num_turns ?? 0, cc: j.usage?.cache_creation_input_tokens ?? 0, block: /^For the customer:/m.test(commit) && /^What changed:/m.test(commit) };
};
const mean = (xs, k) => (xs.length ? xs.reduce((a, x) => a + x[k], 0) / xs.length : NaN);
const fmt = (n) => (Number.isNaN(n) ? "n/a" : n.toFixed(1));

for (const root of process.argv.slice(2)) {
  const rows = [];
  for (const task of readdirSync(root)) {
    const t = join(root, task);
    if (!statSync(t).isDirectory()) continue;
    const bare = runs(join(t, "bare")).map(load);
    const skill = runs(join(t, "skill")).map(load);
    if (!bare.length) continue;
    const bt = mean(bare, "turns");
    const bc = mean(bare, "cc");
    for (const s of skill) rows.push({ block: s.block, dTurns: s.turns - bt, dCc: s.cc - bc });
  }
  console.log(`## ${basename(root)}`);
  for (const [label, sel] of [["commit has the block", rows.filter((r) => r.block)], ["commit has no block", rows.filter((r) => !r.block)]]) {
    console.log(`${label.padEnd(22)} n=${String(sel.length).padStart(2)}  extra turns ${fmt(mean(sel, "dTurns")).padStart(5)}  extra cache-creation tokens ${fmt(mean(sel, "dCc")).padStart(7)}`);
  }
}
