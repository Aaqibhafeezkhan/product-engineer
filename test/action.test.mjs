// action.yml's own shell step, run with the flags a runner gives `shell: bash`, so the input guard and the
// arguments it builds are tested without GitHub. The CI job `action` runs the real `uses: ./`; this
// test is what pins the exact exit codes, which a composite step's outcome does not expose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const action = readFileSync(join(root, "action.yml"), "utf8").replace(/\r\n/g, "\n");

/** The `run: |` block of the composite step, dedented. */
function runBlock(yaml) {
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => /^\s+run: \|\s*$/.test(l));
  assert.ok(start >= 0, "action.yml has no `run: |` block");
  const keyIndent = lines[start].search(/\S/);
  const body = [];
  for (const l of lines.slice(start + 1)) {
    if (l.trim() && l.search(/\S/) <= keyIndent) break;
    body.push(l);
  }
  const indent = Math.min(...body.filter((l) => l.trim()).map((l) => l.search(/\S/)));
  return body.map((l) => l.slice(indent)).join("\n");
}

const script = runBlock(action);
const fixture = (f) => join(root, "test", "fixtures", f);

function run(env) {
  return spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", script], {
    encoding: "utf8",
    env: { ...process.env, ACTION_PATH: root, PR_NUMBER: "", BODY_FILE: "", WARN: "false", COMMENT: "false", GITHUB_TOKEN: "", ...env },
  });
}

test("no unquoted value contains ': ', which YAML reads as a second mapping and GitHub refuses", () => {
  // action.yml carried one from 0.3.0 to 0.4.0: the `comment` description said `pull-requests: write`
  // unquoted, and two YAML parsers (PyYAML, yaml@2) reject the whole file. No test parsed it.
  const lines = action.split("\n");
  const runAt = lines.findIndex((l) => /^\s+run: \|\s*$/.test(l));
  const offending = lines
    .map((l, i) => ({ l, n: i + 1 }))
    .filter(({ n }) => n <= runAt)
    .filter(({ l }) => {
      const m = /^\s*(?:- )?[\w-]+: (.+)$/.exec(l);
      return m && !/^["'|>]/.test(m[1]) && / #|: /.test(m[1]);
    });
  assert.deepEqual(offending.map(({ n, l }) => `${n}: ${l.trim()}`), []);
});

test("the step maps every input it reads into its environment", () => {
  for (const [envName, input] of [["PR_NUMBER", "pr"], ["WARN", "warn"], ["COMMENT", "comment"], ["BODY_FILE", "body-file"], ["GITHUB_TOKEN", "token"]]) {
    assert.match(action, new RegExp(`^  ${input}:\\n`, "m"), `input ${input} is not declared`);
    assert.match(action, new RegExp(`^        ${envName}: \\$\\{\\{ inputs\\.${input} \\}\\}$`, "m"), `${envName} is not mapped from inputs.${input}`);
  }
});

test("a description with the block exits 0", () => {
  const r = run({ BODY_FILE: fixture("with-block.txt") });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("a description without the block exits 1, and 0 with warn", () => {
  const r = run({ BODY_FILE: fixture("without-block.txt") });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /::error/);
  const warned = run({ BODY_FILE: fixture("without-block.txt"), WARN: "true" });
  assert.equal(warned.status, 0, warned.stdout + warned.stderr);
});

test("a pr that is not a number exits 2, even with a body file that would pass", () => {
  for (const pr of ["12a", "1;2", "-1"]) {
    const r = run({ PR_NUMBER: pr, BODY_FILE: fixture("with-block.txt") });
    assert.equal(r.status, 2, `pr ${pr}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /pr must be a number/);
  }
});

test("no pr and no body file exits 2", () => {
  const r = run({});
  assert.equal(r.status, 2, r.stdout + r.stderr);
});
