// action.yml's own shell step, run with the flags a runner gives `shell: bash`, so the input guard and the
// arguments it builds are tested without GitHub. The CI job `action` runs the real `uses: ./`; this
// test is what pins the exact exit codes, which a composite step's outcome does not expose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
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

function run(env, opts = {}) {
  return spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", script], {
    encoding: "utf8",
    cwd: opts.cwd,
    env: { ...process.env, ACTION_PATH: root, PR_NUMBER: "", BODY_FILE: "", WARN: "false", COMMENT: "false", GITHUB_TOKEN: "", DIFF: "", REFERENCES: "", SKIP_AUTHORS: "", PR_AUTHOR: "", ...env },
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
  for (const [envName, input] of [["PR_NUMBER", "pr"], ["WARN", "warn"], ["COMMENT", "comment"], ["BODY_FILE", "body-file"], ["GITHUB_TOKEN", "token"], ["DIFF", "diff"], ["REFERENCES", "references"], ["SKIP_AUTHORS", "skip-authors"], ["PR_AUTHOR", "author"]]) {
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

// GitHub Marketplace refuses an action.yml whose description is 125 characters or longer, and a name
// that equals an existing action, user or organization: "workproof" is a GitHub user, so the listing
// was refused on 2026-10-14 until the name and the description changed.
test("action.yml's name and description fit what GitHub Marketplace accepts", () => {
  const yml = readFileSync(join(root, "action.yml"), "utf8");
  const unquote = (v) => (/^'.*'$/.test(v) ? v.slice(1, -1).replaceAll("''", "'") : v.replace(/^"|"$/g, ""));
  const name = unquote(/^name: (.+)$/m.exec(yml)?.[1] ?? "");
  const description = unquote(/^description: (.+)$/m.exec(yml)?.[1] ?? "");
  assert.ok(name.length > 0 && description.length > 0, "action.yml needs a top-level name and description on one line each");
  assert.ok(description.length < 125, `description is ${description.length} characters; Marketplace needs fewer than 125`);
  assert.notEqual(name, "workproof", "a GitHub user is called workproof, so Marketplace refuses that name");
});

// The three inputs added for #27 and #28. A stand-in bin/check.mjs prints the arguments it was given, so
// these tests see exactly what the step passes on without running the checker.
// Every test below spawns the action's bash step directly. They are skipped on win32 as a precaution:
// nothing here has been run on Windows, and the bash that `spawnSync("bash")` finds there is not
// guaranteed to be Git Bash. The original tests in this file are not skipped; the CI test matrix runs
// them on windows-latest under Git Bash, which the npm script-shell setting selects.
const SHELL_ONLY = process.platform === "win32" ? { skip: "spawns bash directly; not run on Windows, and the bash found there is not guaranteed to be Git Bash" } : {};
function echoingAction() {
  const dir = mkdtempSync(join(tmpdir(), "pe-action-"));
  mkdirSync(join(dir, "bin"));
  writeFileSync(join(dir, "bin", "check.mjs"), "console.log(JSON.stringify(process.argv.slice(2)));\n");
  return dir;
}
const args = (r) => JSON.parse(r.stdout.trim().split("\n").pop());

test("diff is passed on as --diff <range>, and left out when empty", SHELL_ONLY, () => {
  const action = echoingAction();
  const given = run({ ACTION_PATH: action, BODY_FILE: fixture("with-block.txt"), DIFF: "origin/main...HEAD" });
  assert.equal(given.status, 0, given.stderr);
  const a = args(given);
  assert.equal(a[a.indexOf("--diff") + 1], "origin/main...HEAD");
  const none = run({ ACTION_PATH: action, BODY_FILE: fixture("with-block.txt") });
  assert.ok(!args(none).includes("--diff"));
});

test("diff that is not a plain revision range exits 2 before anything runs", SHELL_ONLY, () => {
  const action = echoingAction();
  for (const diff of ["--stat", "-x", "main; ls", "$(id)", "a b", "`id`", "main|cat"]) {
    const r = run({ ACTION_PATH: action, BODY_FILE: fixture("with-block.txt"), DIFF: diff });
    assert.equal(r.status, 2, `diff ${diff}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /diff must be a git revision range/);
    assert.equal(r.stdout, "", `diff ${diff} reached the checker`);
  }
});

test("references accepts off, warn and error, passes them on, and refuses anything else", SHELL_ONLY, () => {
  const action = echoingAction();
  for (const mode of ["off", "warn", "error"]) {
    const a = args(run({ ACTION_PATH: action, BODY_FILE: fixture("with-block.txt"), REFERENCES: mode }));
    assert.equal(a[a.indexOf("--references") + 1], mode);
  }
  assert.ok(!args(run({ ACTION_PATH: action, BODY_FILE: fixture("with-block.txt") })).includes("--references"));
  const bad = run({ ACTION_PATH: action, BODY_FILE: fixture("with-block.txt"), REFERENCES: "strict" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /references must be off, warn or error/);
});

test("diff and references reach the real checker and a description that passes still exits 0", SHELL_ONLY, () => {
  const r = run({ BODY_FILE: fixture("with-block.txt"), DIFF: "HEAD", REFERENCES: "error" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("a pull request opened by a listed bot is skipped with one notice line, and a human's is checked", SHELL_ONLY, () => {
  const bot = run({ BODY_FILE: fixture("without-block.txt"), PR_AUTHOR: "dependabot[bot]", SKIP_AUTHORS: "dependabot[bot],renovate[bot]" });
  assert.equal(bot.status, 0, bot.stdout + bot.stderr);
  assert.match(bot.stdout, /^::notice title=product-engineer::skipped, the pull request was opened by dependabot\[bot\], which is in skip-authors$/m);
  assert.doesNotMatch(bot.stdout, /::error/);
  const human = run({ BODY_FILE: fixture("without-block.txt"), PR_AUTHOR: "someone", SKIP_AUTHORS: "dependabot[bot],renovate[bot]" });
  assert.equal(human.status, 1, human.stdout + human.stderr);
});

test("an empty skip-authors turns skipping off, and spaces around a login are ignored", SHELL_ONLY, () => {
  const off = run({ BODY_FILE: fixture("without-block.txt"), PR_AUTHOR: "dependabot[bot]", SKIP_AUTHORS: "" });
  assert.equal(off.status, 1);
  const spaced = run({ BODY_FILE: fixture("without-block.txt"), PR_AUTHOR: "renovate[bot]", SKIP_AUTHORS: "dependabot[bot] , renovate[bot]" });
  assert.equal(spaced.status, 0, spaced.stdout + spaced.stderr);
});

test("no author (a push event) is never skipped, including when the list has empty entries", SHELL_ONLY, () => {
  for (const list of ["dependabot[bot]", "dependabot[bot],,", ",x", ","]) {
    const r = run({ BODY_FILE: fixture("without-block.txt"), PR_AUTHOR: "", SKIP_AUTHORS: list });
    assert.equal(r.status, 1, `skip-authors "${list}" with no author: ${r.stdout}${r.stderr}`);
    assert.doesNotMatch(r.stdout, /::notice/, `skip-authors "${list}" with no author printed a skip notice`);
  }
});

test("a login is compared as text, not as a glob: a file called dependabott does not make dependabott a bot", SHELL_ONLY, () => {
  const cwd = mkdtempSync(join(tmpdir(), "pe-glob-"));
  writeFileSync(join(cwd, "dependabott"), "");
  const imposter = run({ BODY_FILE: fixture("without-block.txt"), PR_AUTHOR: "dependabott", SKIP_AUTHORS: "dependabot[bot]" }, { cwd });
  assert.equal(imposter.status, 1, imposter.stdout + imposter.stderr);
  const real = run({ BODY_FILE: fixture("without-block.txt"), PR_AUTHOR: "dependabot[bot]", SKIP_AUTHORS: "dependabot[bot]" }, { cwd });
  assert.equal(real.status, 0, real.stdout + real.stderr);
});

test("a bad pr number is still exit 2 when the author would have been skipped", SHELL_ONLY, () => {
  const r = run({ PR_NUMBER: "12a", BODY_FILE: fixture("with-block.txt"), PR_AUTHOR: "dependabot[bot]", SKIP_AUTHORS: "dependabot[bot]" });
  assert.equal(r.status, 2);
});
