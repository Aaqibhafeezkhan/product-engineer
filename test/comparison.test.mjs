// The comparison harness: pins, fetch plan, the two checker runners, the verdict, the renderer and the
// generated document. Nothing here reaches the network or a model. The real commitlint run is
// `node evals/comparison/checker.mjs --run`, whose output is committed and checked at the end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readPins, checkPins, plan } from "../scripts/comparison/fetch-upstream.mjs";
import { CASES, AREAS } from "../evals/comparison/cases.mjs";
import { runOurs, runCommitlint, verdict } from "../evals/comparison/checker.mjs";
import { renderComparison } from "../evals/comparison/render.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pins = readPins();

test("_upstream/ is ignored by git, so no competitor file can be committed by accident", () => {
  const r = spawnSync("git", ["check-ignore", "-q", "_upstream/anything/at/all.md"], { cwd: root });
  assert.equal(r.status, 0);
});

test("every pin names a licence and a full commit, and only permissive skills may be copied", () => {
  assert.equal(checkPins(pins), true);
  const bad = structuredClone(pins);
  bad.skills[0].licence = "GPL-3.0-only";
  assert.throws(() => checkPins(bad), /may not be copied/);
  const unlicensed = structuredClone(pins);
  unlicensed.skills[1].copy = true;
  assert.throws(() => checkPins(unlicensed), /may not be copied/);
  const loose = structuredClone(pins);
  loose.skills[0].commit = "main";
  assert.throws(() => checkPins(loose), /40-character/);
});

test("the unlicensed skill is run only, never copied", () => {
  const composio = pins.skills.find((s) => s.id === "changelog-generator");
  assert.equal(composio.copy, false);
  assert.match(composio.licence, /none/);
});

test("the fetch plan installs commitlint at the pinned versions and fetches each repository at its sha, inside _upstream", () => {
  const up = join(root, "_upstream");
  const steps = plan(pins, up);
  const flat = steps.map(([cmd, args]) => `${cmd} ${args.join(" ")}`);
  assert.ok(flat.some((s) => s.includes(`npm install --prefix ${join(up, "commitlint")}`) && s.includes(`@commitlint/cli@${pins.checkers[0].npm["@commitlint/cli"]}`)));
  for (const skill of pins.skills) assert.ok(flat.some((s) => s.includes(`${skill.repo}.git ${skill.commit}`)), skill.repo);
  for (const [, args, cwd] of steps) assert.ok(cwd === root || cwd.startsWith(up), `${cwd} is outside _upstream`);
});

test("the dry run prints the commands and runs nothing", () => {
  const out = execFileSync("node", ["scripts/comparison/fetch-upstream.mjs", "--dry-run"], { cwd: root, encoding: "utf8" });
  assert.match(out, /npm install/);
  assert.match(out, /git fetch/);
});

test("every case belongs to a known area and ids are unique", () => {
  const ids = CASES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of CASES) assert.ok(AREAS[c.area], `${c.id}: unknown area ${c.area}`);
});

// What product-engineer itself says about each case, read from the running checker rather than typed
// from the document. A change to a check that moves one of these has to say so here.
const OURS = {
  "block-present": "passed",
  "block-missing": "flagged",
  "block-empty": "flagged",
  "block-turkish": "passed",
  "jargon-unexplained": "flagged",
  "tests-as-evidence": "flagged",
  "bare-number": "flagged",
  "diff-tests-claim": "flagged",
  "subject-not-conventional": "passed",
  "subject-too-long": "passed",
  "body-line-too-long": "passed",
  "merge-commit": "passed",
};

test("product-engineer's own runner gives the expected outcome on every case", () => {
  assert.deepEqual(Object.keys(OURS).sort(), CASES.map((c) => c.id).sort());
  for (const c of CASES) assert.equal(runOurs(c).outcome, OURS[c.id], c.id);
});

test("the commitlint runner maps an exit status to an outcome and names the rules that fired", () => {
  const spawn = (status, stdout) => () => ({ status, stdout, stderr: "" });
  const c = CASES.find((x) => x.id === "subject-not-conventional");
  const flagged = runCommitlint(c, { dir: "/x", spawn: spawn(1, "✖ subject may not be empty [subject-empty]\n✖ type may not be empty [type-empty]\n") });
  assert.equal(flagged.outcome, "flagged");
  assert.equal(flagged.detail, "subject-empty, type-empty");
  assert.equal(runCommitlint(c, { dir: "/x", spawn: spawn(0, "") }).outcome, "passed");
  const needsChange = CASES.find((x) => x.change);
  assert.equal(runCommitlint(needsChange, { dir: "/x", spawn: () => assert.fail("must not run") }).outcome, "cannot");
  assert.throws(() => runCommitlint(c, { dir: "/x", spawn: () => ({ status: null, error: new Error("ENOENT") }) }), /did not run/);
});

test("verdict: right means flagging a defect or passing a clean message, and cannot is never right", () => {
  assert.equal(verdict(true, "flagged", "passed"), "ours wins");
  assert.equal(verdict(true, "passed", "flagged"), "ours loses");
  assert.equal(verdict(true, "flagged", "flagged"), "tie");
  assert.equal(verdict(false, "passed", "passed"), "tie");
  assert.equal(verdict(false, "flagged", "passed"), "ours loses");
  assert.equal(verdict(true, "passed", "passed"), "neither");
  assert.equal(verdict(true, "flagged", "cannot"), "ours wins");
});

const fixture = {
  runDate: "2030-01-02",
  ourVersion: "9.9.9",
  tool: { id: "commitlint", name: "commitlint", licence: "MIT", version: "1.2.3", config: "@commitlint/config-conventional" },
  rows: [
    { id: "block-missing", area: "customer-block", title: "No customer block", defect: true, ours: { outcome: "flagged", detail: "" }, theirs: { outcome: "passed", detail: "" }, verdict: "ours wins" },
    { id: "subject-too-long", area: "conventional-format", title: "A subject over 100 characters", defect: true, ours: { outcome: "passed", detail: "" }, theirs: { outcome: "flagged", detail: "header-max-length" }, verdict: "ours loses" },
  ],
};

test("the document carries the run date and both versions, and keeps every row, including the losses", () => {
  const md = renderComparison({ checker: fixture, skills: null, pins });
  assert.match(md, /Run on 2030-01-02 with product-engineer 9\.9\.9 and commitlint 1\.2\.3/);
  const tableLines = md.split("\n").filter((l) => l.startsWith("| "));
  for (const r of fixture.rows) assert.ok(tableLines.some((l) => l.includes(`\`${r.id}\``)), `${r.id} has no table row`);
  const section = md.split("### Where product-engineer loses")[1].split("\n\n")[1];
  assert.match(section, /subject-too-long/);
  assert.match(md, /\| product-engineer loses \|/);
});

test("a run with no losses says so instead of printing an empty list", () => {
  const none = structuredClone(fixture);
  none.rows = [none.rows[0]];
  assert.match(renderComparison({ checker: none, skills: null, pins }), /No case in this run\./);
});

test("docs/COMPARISON.md is exactly what the committed results produce", () => {
  const r = spawnSync("node", ["evals/comparison/render.mjs", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});
