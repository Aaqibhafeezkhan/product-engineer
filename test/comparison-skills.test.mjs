// The skill side of the comparison: evals/run.sh installing a skill from outside the repository, the
// snapshot that leaves transcripts behind, the counting, the cost estimate and the rendered section.
// The runs themselves call a model and are never made here; a shell script named `claude` stands in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { snapshot, collect } from "../evals/comparison/skills.mjs";
import { estimate, meanSkillCost } from "../scripts/comparison/run-skills.mjs";
import { renderSkills } from "../evals/comparison/render.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skipOnWindows = { skip: process.platform === "win32" ? "the fake claude is a shell script" : false };
const tmp = (name) => mkdtempSync(join(tmpdir(), `pe-${name}-`));

function rivalSkill() {
  const dir = join(tmp("rival"), "my-rival");
  mkdirSync(dir);
  writeFileSync(join(dir, "SKILL.md"), "---\nname: my-rival\ndescription: A stand-in.\n---\n");
  return dir;
}

function fakeClaude() {
  const dir = tmp("bin");
  const file = join(dir, "claude");
  writeFileSync(
    file,
    '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "9.9.9 (fake)"; exit 0; fi\n' +
      'echo "{\\"result\\":\\"installed: $(ls .claude/skills 2>/dev/null | tr \'\\n\' \' \')\\",\\"total_cost_usd\\":0.25,\\"num_turns\\":3,\\"duration_ms\\":10,\\"modelUsage\\":{\\"fake-model\\":{}}}"\n',
  );
  chmodSync(file, 0o755);
  return dir;
}

function runSh(env, args = []) {
  return spawnSync("sh", ["evals/run.sh", ...args], { cwd: root, encoding: "utf8", env: { ...process.env, PE_EVAL_OUT: tmp("out"), ...env } });
}

test("a skill from outside the repository is named in the plan and nothing runs without --yes", skipOnWindows, () => {
  const r = runSh({ PE_EVAL_SKILL_PATH: rivalSkill(), PE_EVAL_SKILL_SOURCE: "owner/repo@abc1234" });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /skill\s+my-rival \(installed in the skill arm only\)/);
  assert.match(r.stdout, /source\s+owner\/repo@abc1234/);
  assert.match(r.stdout, /Nothing has run/);
});

test("PE_EVAL_SKILL and PE_EVAL_SKILL_PATH together, or a path with no SKILL.md, are refused", skipOnWindows, () => {
  const both = runSh({ PE_EVAL_SKILL: "customer-block", PE_EVAL_SKILL_PATH: rivalSkill() });
  assert.equal(both.status, 1);
  assert.match(both.stderr, /not both/);
  const empty = runSh({ PE_EVAL_SKILL_PATH: tmp("empty") });
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /no SKILL\.md/);
});

test("the skill is installed under its own name and meta.json records where it came from", skipOnWindows, () => {
  const out = tmp("run");
  const r = runSh(
    { PATH: `${fakeClaude()}:${process.env.PATH}`, PE_EVAL_OUT: out, PE_EVAL_SKILL_PATH: rivalSkill(), PE_EVAL_SKILL_SOURCE: "owner/repo@abc1234" },
    ["01", "skill", "--yes"],
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const dir = join(out, "01-export-safari", "skill");
  assert.match(readFileSync(join(dir, "final.md"), "utf8"), /installed: my-rival/);
  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  assert.equal(meta.skill, "my-rival");
  assert.equal(meta.source, "owner/repo@abc1234");
  assert.equal(meta.cost_usd, 0.25);
});

function writeRun(dir, { commit, final = "I checked it and it works.\n", model = "claude-opus-5", skill = null, source = null, cost = 0.5 }) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "final.md"), final);
  writeFileSync(join(dir, "commit.txt"), commit);
  writeFileSync(join(dir, "changed.txt"), "src/export.js\n");
  writeFileSync(join(dir, "exit.txt"), "0\n");
  writeFileSync(join(dir, "transcript.json"), '{"result":"the whole skill text would be in here"}');
  writeFileSync(join(dir, "stderr.txt"), "");
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ requested_model: model, cli: "1.0.0", skill, source, cost_usd: cost }));
}

const WITH_BLOCK = "fix: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n";
const task = "01-export-safari";

test("a snapshot keeps what the scorer reads and leaves the transcript and stderr behind", () => {
  const src = tmp("src");
  writeRun(join(src, task, "skill"), { commit: WITH_BLOCK });
  const dest = tmp("dest");
  assert.equal(snapshot(src, join(dest, "rival")), 1);
  const copied = join(dest, "rival", task, "skill");
  for (const f of ["final.md", "commit.txt", "changed.txt", "meta.json", "exit.txt"]) assert.ok(existsSync(join(copied, f)), f);
  for (const f of ["transcript.json", "stderr.txt"]) assert.ok(!existsSync(join(copied, f)), `${f} was copied`);
});

test("collect counts the reference arms and each rival, and lists a rival with no run as not run", () => {
  const ref = tmp("ref");
  writeRun(join(ref, task, "bare"), { commit: "fix: x\n" });
  writeRun(join(ref, task, "skill"), { commit: WITH_BLOCK, skill: "product-engineer" });
  const snaps = tmp("snaps");
  writeRun(join(snaps, "rival-a", task, "skill"), { commit: "fix: x\n", skill: "rival-a", source: "o/r@abc1234", cost: 1 });
  const pins = { skills: [{ id: "rival-a", name: "Rival A", licence: "MIT" }, { id: "rival-b", name: "Rival B", licence: "none detected" }] };
  const out = collect({ referenceDir: ref, snapshotsDir: snaps, pins, date: "2030-01-02", ourVersion: "9.9.9" });
  const by = Object.fromEntries(out.arms.map((a) => [a.id, a]));
  assert.equal(by.bare.counts.customerBlock, 0);
  assert.equal(by["product-engineer"].counts.customerBlock, 1);
  assert.equal(by["rival-a"].counts.customerBlock, 0);
  assert.equal(by["rival-a"].meanCostUsd, 1);
  assert.equal(by["rival-a"].source, "o/r@abc1234");
  assert.deepEqual(out.notRun.map((n) => n.id), ["rival-b"]);
});

test("the cost estimate multiplies the published mean by the runs, and reads the mean from meta.json", () => {
  assert.equal(estimate({ meanCostUsd: 0.5, tasks: 8, rivals: 2 }), 8);
  assert.equal(estimate({ meanCostUsd: 0.5, tasks: 8, rivals: 2, runs: 3 }), 24);
  const ref = tmp("cost");
  writeRun(join(ref, task, "bare"), { commit: "x\n", cost: 9 });
  writeRun(join(ref, task, "skill"), { commit: "x\n", cost: 0.5 });
  assert.equal(meanSkillCost(ref), 0.5);
});

test("run-skills prints the plan and the estimate, and spends nothing without --yes", () => {
  const r = spawnSync("node", ["scripts/comparison/run-skills.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /estimated cost\s+about \$\d+\.\d\d/);
  assert.match(r.stdout, /Nothing has run/);
});

const skillsFixture = {
  runDate: "2030-01-02",
  ourVersion: "9.9.9",
  reference: { dir: "evals/results-2026-10-17/core", model: "claude-opus-5", cli: "1.0.0" },
  metrics: [{ key: "customerBlock", title: "Block" }, { key: "observedOrHonest", title: "Observed" }],
  arms: [
    { id: "bare", label: "bare", n: 8, counts: { customerBlock: 0, observedOrHonest: 1 }, meanCostUsd: 0.4, model: "claude-opus-5", cli: "1.0.0" },
    { id: "product-engineer", label: "product-engineer", n: 8, counts: { customerBlock: 8, observedOrHonest: 6 }, meanCostUsd: 0.6, model: "claude-opus-5", cli: "1.0.0" },
    { id: "rival", label: "Rival (MIT)", n: 8, counts: { customerBlock: 0, observedOrHonest: 8 }, meanCostUsd: 0.5, model: "claude-opus-5", cli: "2.0.0" },
  ],
  notRun: [{ id: "other", reason: "no paid run has been made yet" }],
};

test("the skills section prints a loss as a loss, a note when the CLI differs, and what was not run", () => {
  const md = renderSkills(skillsFixture, { considered: [] });
  assert.match(md, /- LOSS: Observed: product-engineer 6 \/ 8, rival 8 \/ 8\./);
  assert.match(md, /Note: the `rival` arm ran with model `claude-opus-5` and CLI `2\.0\.0`/);
  assert.match(md, /`other`: no paid run has been made yet/);
  assert.match(md, /\| Block \| 0 \/ 8 \| 8 \/ 8 \| 0 \/ 8 \|/);
});

test("with no skills results the section says the runs have not been made", () => {
  assert.match(renderSkills(null, { considered: [] }), /Not run yet/);
});
