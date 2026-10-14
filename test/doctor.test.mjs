import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { doctor, render, rulesFrom, versionFrom } from "../bin/doctor.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packaged = readFileSync(join(root, "skills", "product-engineer", "SKILL.md"), "utf8");

function project() {
  const dir = mkdtempSync(join(tmpdir(), "pe-doctor-"));
  return dir;
}

function put(dir, rel, text) {
  const full = join(dir, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
}

test("an empty project reports nothing installed", () => {
  const dir = project();
  const report = doctor({ cwd: dir, home: project() });
  assert.equal(report.found, 0);
  assert.match(render(report), /No copy found/);
});

test("a matching copy is current and carries its version", () => {
  const dir = project();
  put(dir, ".claude/skills/product-engineer/SKILL.md", packaged);
  const report = doctor({ cwd: dir, home: project() });
  assert.equal(report.found, 1);
  assert.equal(report.stale, 0);
  assert.equal(report.scopes[0].rows[0].state, "current");
  assert.equal(report.scopes[0].rows[0].version, versionFrom(packaged));
});

test("a copy with older rules is out of date", () => {
  const dir = project();
  put(dir, ".claude/skills/product-engineer/SKILL.md", packaged.replace("## 7. Smallest change that moves the metric", "## 7. An older seventh rule"));
  const report = doctor({ cwd: dir, home: project() });
  assert.equal(report.stale, 1);
  assert.match(render(report), /out of date/);
  assert.match(render(report), /npx skills add/);
});

test("an adapter file counts when it embeds the rules", () => {
  const dir = project();
  put(dir, "AGENTS.md", `# something else\n\n${rulesFrom(packaged)}\n`);
  const report = doctor({ cwd: dir, home: project() });
  assert.equal(report.found, 1);
  assert.equal(report.scopes[0].rows[0].state, "current");
});

test("an unrelated AGENTS.md is not counted as a copy", () => {
  const dir = project();
  put(dir, "AGENTS.md", "# House rules\n\nRun the tests before pushing.\n");
  assert.equal(doctor({ cwd: dir, home: project() }).found, 0);
});

test("running in your home directory counts each copy once", () => {
  const dir = project();
  put(dir, ".claude/skills/product-engineer/SKILL.md", packaged);
  assert.equal(doctor({ cwd: dir, home: dir }).found, 1);
});

test("project and user scopes are reported separately", () => {
  const proj = project();
  const home = project();
  put(proj, ".agents/skills/product-engineer/SKILL.md", packaged);
  put(home, ".claude/skills/product-engineer/SKILL.md", packaged);
  const report = doctor({ cwd: proj, home });
  assert.deepEqual(report.scopes.map((s) => s.scope), ["project", "user"]);
  assert.equal(report.found, 2);
});

test("the command exits 1 when a copy is out of date", () => {
  const dir = project();
  put(dir, ".claude/skills/product-engineer/SKILL.md", packaged.replace("## 1. Restate before building", "## 1. Old rule"));
  const run = spawnSync(process.execPath, [join(root, "bin", "doctor.mjs")], { cwd: dir, env: { ...process.env, HOME: dir }, encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /1 out of date/);
});

test("the bin exposes doctor as a subcommand", () => {
  const dir = project();
  const run = spawnSync(process.execPath, [join(root, "bin", "check.mjs"), "doctor"], { cwd: dir, env: { ...process.env, HOME: dir }, encoding: "utf8" });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /No copy found/);
});

test("the reported version is the package's, not the version a SKILL.md carries", () => {
  // doctor used to print the SKILL.md metadata.version, which had drifted to 0.3.2 while the
  // package was 0.4.0. A skill file with a version nobody ships proves which one is read.
  const dir = project();
  const skill = join(dir, "SKILL.md");
  writeFileSync(skill, packaged.replace(/^(\s*version:\s*)\S+\s*$/m, "$19.9.9"));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const report = doctor({ cwd: project(), home: project(), packagedPath: skill });
  assert.equal(report.version, pkg.version);
  assert.match(render(report), new RegExp(`^product-engineer ${pkg.version.replaceAll(".", "\\.")}$`, "m"));
});
