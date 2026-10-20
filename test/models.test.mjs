// The second-model study's harness: the spend ceiling in evals/run.sh and the per-model report in
// evals/by-model.mjs. The runs themselves call a model and are never made here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { reading, summarise, render } from "../evals/by-model.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skipOnWindows = { skip: process.platform === "win32" ? "the fake claude is a shell script" : false };
const tmp = (name) => mkdtempSync(join(tmpdir(), `pe-${name}-`));

function fakeClaude(cost) {
  const dir = tmp("bin");
  const file = join(dir, "claude");
  writeFileSync(file, `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "9.9.9 (fake)"; exit 0; fi\necho '{"result":"x","total_cost_usd":${cost}}'\n`);
  chmodSync(file, 0o755);
  return dir;
}
const runSh = (env, args) => spawnSync("sh", ["evals/run.sh", ...args], { cwd: root, encoding: "utf8", env: { ...process.env, ...env } });

test("a run past the budget stops after that run and exits 3, with the results so far kept", skipOnWindows, () => {
  const out = tmp("budget");
  const r = runSh({ PATH: `${fakeClaude(0.25)}:${process.env.PATH}`, PE_EVAL_OUT: out, PE_EVAL_BUDGET_USD: "0.4" }, ["", "", "--yes"]);
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /budget of \$0\.4 exceeded after \$0\.5000/);
  const metas = readdirSync(out, { recursive: true }).filter((f) => String(f).endsWith("meta.json"));
  assert.equal(metas.length, 2);
});

test("with no budget set the same runs all complete", skipOnWindows, () => {
  const out = tmp("nobudget");
  const r = runSh({ PATH: `${fakeClaude(0.25)}:${process.env.PATH}`, PE_EVAL_OUT: out }, ["01", "", "--yes"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /budget\s+none USD/);
});

test("a budget that is not a number is refused before anything runs", skipOnWindows, () => {
  const r = runSh({ PE_EVAL_OUT: tmp("bad"), PE_EVAL_BUDGET_USD: "five" }, ["", "", "--yes"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /must be a number of dollars/);
});

test("the reading is fixed by the interval alone", () => {
  assert.equal(reading(0.1, 0.9), "worked");
  assert.equal(reading(-0.9, -0.1), "worse");
  assert.equal(reading(-0.2, 0.6), "no clear effect");
  assert.equal(reading(0, 0.5), "no clear effect");
});

const WITH_BLOCK = "fix: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n";

/** Three tasks, three runs per arm; `block(condition)` says whether that arm's commits carry the block. */
function fixtureDir(model, block) {
  const dir = tmp("model");
  for (const task of ["01-export-safari", "02-notification-badge", "03-refactor-pricing"]) {
    for (const condition of ["bare", "skill"]) {
      for (let n = 1; n <= 3; n++) {
        const d = join(dir, task, condition, `run-${n}`);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, "final.md"), "Done.\n");
        writeFileSync(join(d, "commit.txt"), block(condition) ? WITH_BLOCK : "fix: x\n");
        writeFileSync(join(d, "changed.txt"), "src/export.js\n");
        writeFileSync(join(d, "meta.json"), JSON.stringify({ requested_model: model, cli: "1.0.0", skill: condition === "skill" ? "product-engineer" : null, cost_usd: condition === "skill" ? 0.2 : 0.1 }));
      }
    }
  }
  return join(dir);
}

const rowFor = (s, key) => s.rows.find((r) => r.key === key);

test("a model where the skill adds the block every time reads as worked on that metric", () => {
  const s = summarise(fixtureDir("model-a", (c) => c === "skill"));
  assert.equal(s.model, "model-a");
  const r = rowFor(s, "customerBlock");
  assert.equal(r.bare, 0);
  assert.equal(r.skill, 9);
  assert.equal(r.reading, "worked");
});

test("a model where the skill changes nothing reads as no clear effect, and one where it removes the block as worse", () => {
  assert.equal(rowFor(summarise(fixtureDir("model-b", () => true)), "customerBlock").reading, "no clear effect");
  assert.equal(rowFor(summarise(fixtureDir("model-c", (c) => c === "bare")), "customerBlock").reading, "worse");
});

test("the report has one section per model, prints a null result like a positive one, and never averages", () => {
  const md = render([summarise(fixtureDir("model-a", (c) => c === "skill")), summarise(fixtureDir("model-b", () => true))]);
  assert.match(md, /## model-a/);
  assert.match(md, /## model-b/);
  assert.match(md, /\| worked \|/);
  assert.match(md, /\| no clear effect \|/);
  assert.doesNotMatch(md, /average of|overall mean|all models combined/i);
  assert.match(md, /Mean cost per run: bare \$0\.10, skill \$0\.20\. Total for the 18 runs in this directory: \$2\.70\./);
});
