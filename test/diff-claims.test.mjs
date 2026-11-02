// The direction of an operation and the other claims a diff can decide by itself. Every test
// builds a real repository, stages a real change, and runs the real checker on it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDiff, crossCheck } from "../bin/diff.mjs";
import { operationClaims, removedExports } from "../bin/diff-claims.mjs";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");

/** A repository whose first commit holds `base`; `change` is then staged on top (null deletes). */
function repo(base, change) {
  const dir = mkdtempSync(join(tmpdir(), "pe-claims-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "--quiet", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "T");
  const write = (files) => {
    for (const [path, body] of Object.entries(files)) {
      if (body === null) {
        git("rm", "--quiet", "-f", path);
        continue;
      }
      mkdirSync(join(dir, dirname(path)), { recursive: true });
      writeFileSync(join(dir, path), body);
    }
  };
  write(base);
  git("add", "-A");
  git("commit", "--quiet", "-m", "init");
  write(change);
  git("add", "-A");
  return { dir, git };
}

const check = (message, base, change) => {
  const { dir } = repo(base, change);
  try {
    return crossCheck(message, readDiff({ cwd: dir }), { cwd: dir });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const codes = (f) => f.filter((x) => x.level === "warn").map((x) => x.code);

const API = "export function login(req) {\n  requireAuth(req);\n  return 1;\n}\nexport function helper() {\n  return 1;\n}\n";

test("a file named as added that the change deletes is reported, and so is the reverse", () => {
  const base = { "src/old.js": "old\n", "src/keep.js": "k\n" };
  assert.deepEqual(codes(check("feat: added `src/old.js` for legacy lookups", base, { "src/old.js": null })), ["diff-file-operation"]);
  assert.deepEqual(codes(check("chore: removed `src/new.js`", base, { "src/new.js": "n\n" })), ["diff-file-operation"]);
  // The claims that are true stay quiet and are confirmed.
  const ok = check("chore: deleted `src/old.js`", base, { "src/old.js": null });
  assert.deepEqual(codes(ok), []);
  assert.ok(ok.some((f) => f.code === "diff-file-operation-ok"));
  // A rename is neither an add nor a delete of the new path.
  assert.deepEqual(codes(check("chore: renamed `src/old.js` to `src/moved.js`", base, { "src/old.js": null, "src/moved.js": "old\n" })), []);
  assert.deepEqual(codes(check("chore: removed `src/old.js`", base, { "src/old.js": null, "src/moved.js": "old\n" })), []);
});

test("an operation on a file the change does not touch, or with a preposition, is not decided", () => {
  const base = { "src/old.js": "old\n", "src/keep.js": "k\n" };
  assert.deepEqual(codes(check("removed `src/keep.js`", base, { "src/other.js": "x\n" })), []);
  // "usage of the file" is a change to its callers, not to the file.
  assert.deepEqual(codes(check("Dropped the import of `src/old.js` from the index.", base, { "src/old.js": null })), []);
  // An intention or a negation is not a claim about this change.
  assert.deepEqual(codes(check("We will remove `src/new.js` later, and did not add `src/old.js`.", base, { "src/old.js": null, "src/new.js": "n\n" })), []);
});

test("an identifier named as removed that only appears on added lines is reported", () => {
  const base = { "src/api.js": API };
  const added = API.replace("return 1;\n}\nexport function helper", "return legacyLookup(req);\n}\nexport function helper");
  assert.deepEqual(codes(check("fix: removed the `legacyLookup` call from login", base, { "src/api.js": added })), ["diff-symbol-direction"]);
  // The reverse: named as added, but only removed.
  const removed = API.replace("  requireAuth(req);\n", "");
  assert.deepEqual(codes(check("fix: added a `requireAuth` call to login", base, { "src/api.js": removed })), ["diff-symbol-direction"]);
  // Silent when the change says the same thing, and when the name is on both sides (an edit).
  assert.deepEqual(codes(check("fix: removed the `requireAuth` call from login", base, { "src/api.js": removed })), []);
  const edited = API.replace("requireAuth(req)", "requireAuth(req, { strict: true })");
  assert.deepEqual(codes(check("fix: removed `requireAuth`", base, { "src/api.js": edited })), []);
  // A name absent from the change cannot be decided either way.
  assert.deepEqual(codes(check("fix: removed `neverMentioned`", base, { "src/api.js": removed })), []);
});

test("the example from the brief: authentication removed against added", () => {
  const base = { "src/api.js": API };
  const addedAuth = API.replace("return 1;\n}\nexport function helper", "authenticateUser(req);\n  return 1;\n}\nexport function helper");
  // Says removed; the change only adds a line about authentication.
  assert.deepEqual(codes(check("fix: removed the authentication check from login", base, { "src/api.js": addedAuth })), ["diff-concept-direction"]);
  // Says added; the change only removes the line about it.
  const removedAuth = API.replace("  requireAuth(req);\n", "");
  assert.deepEqual(codes(check("fix: added an authentication check to login", base, { "src/api.js": removedAuth })), ["diff-concept-direction"]);
  // Consistent claims stay quiet.
  assert.deepEqual(codes(check("fix: removed the authentication check from login", base, { "src/api.js": removedAuth })), []);
  assert.deepEqual(codes(check("fix: added an authentication check to login", base, { "src/api.js": addedAuth })), []);
  // "author" is not authentication, and a comment line does not count.
  const authorLine = API.replace("return 1;\n}\nexport function helper", "return 1; // author: a\n}\nexport function helper");
  assert.deepEqual(codes(check("fix: removed the authentication check from login", base, { "src/api.js": authorLine })), []);
});

test("a bug fix over a change that is documentation only is reported, a documentation fix is not", () => {
  const base = { "src/api.js": API, "README.md": "# r\n" };
  const docs = { "README.md": "# r\nmore\n" };
  assert.deepEqual(codes(check("fix: fixed the crash when the booking is empty", base, docs)), ["diff-fix-docs-only"]);
  assert.deepEqual(codes(check("fix(parser): handle empty input\n\nFixes the crash on an empty booking.", base, docs)), ["diff-fix-docs-only"]);
  // Documentation words, a docs scope, or a code change make the claim fine.
  assert.deepEqual(codes(check("fix: broken link in the README", base, docs)), []);
  assert.deepEqual(codes(check("fix(docs): the install steps", base, docs)), []);
  assert.deepEqual(codes(check("fix: fixed the crash", base, { ...docs, "src/api.js": API + "// x\n" })), []);
  assert.deepEqual(codes(check("docs: explain the crash fix", base, docs)), []);
});

test("no breaking changes over a removed export is reported; a moved or renamed-away name is not", () => {
  const base = { "src/api.js": API };
  const without = API.replace("export function helper() {\n  return 1;\n}\n", "");
  const f = check("refactor: tidy the API. No breaking changes.", base, { "src/api.js": without });
  assert.deepEqual(codes(f), ["diff-breaking-export-removed"]);
  assert.match(f.find((x) => x.code === "diff-breaking-export-removed").message, /`helper` \(src\/api\.js\)/);
  // The name reappears (moved to another file): not removed.
  assert.deepEqual(codes(check("refactor: move helper. Backwards compatible.", base, { "src/api.js": without, "src/util.js": "export function helper() {\n  return 1;\n}\n" })), []);
  // No claim, no finding; and the opposite claim is not matched.
  assert.deepEqual(codes(check("refactor: remove helper", base, { "src/api.js": without })), []);
  assert.deepEqual(codes(check("refactor: remove helper. This is not backwards compatible.", base, { "src/api.js": without })), []);
  assert.deepEqual(codes(check("refactor: remove helper\n\nBREAKING CHANGE: helper is gone", base, { "src/api.js": without })), []);
  // An export removed from a test or scripts path is not public API.
  assert.deepEqual(codes(check("No breaking changes.", { "scripts/x.mjs": "export const a = 1;\n" }, { "scripts/x.mjs": "const b = 2;\n" })), []);
});

test("removedExports reads the common export shapes", () => {
  const patch = new Map([
    ["a.ts", { added: [], removed: ["export const one = 1;", "export { two, three as four };", "export default class Five {}"] }],
    ["b.py", { added: [], removed: ["def six(x):", "def _private():", "class Seven:"] }],
    ["c.go", { added: [], removed: ["func Eight(x int) int {", "func nine() {"] }],
  ]);
  const names = removedExports(patch, [{ path: "a.ts" }, { path: "b.py" }, { path: "c.go" }]).map((g) => g.name).sort();
  assert.deepEqual(names, ["Eight", "Five", "Seven", "four", "one", "six", "two"].sort());
});

test("claims that need an observation are listed as claimed only, never judged", () => {
  const f = check("fix: tweak old\n\nI ran the tests and they all pass. About 40% faster.", { "src/a.js": "a\n" }, { "src/a.js": "b\n" });
  const only = f.filter((x) => x.code === "diff-claimed-only");
  assert.equal(only.length, 2);
  assert.ok(only.every((x) => x.level === "info"));
  assert.match(only[0].message, /not checkable from a diff \(tests were run or pass\)/);
  // A statement that something was NOT run is honest and is not listed.
  assert.equal(check("fix: tweak\n\nI could not run the tests here.", { "src/a.js": "a\n" }, { "src/a.js": "b\n" }).filter((x) => x.code === "diff-claimed-only").length, 0);
});

test("operationClaims ignores quoted text, fenced code and intentions", () => {
  assert.equal(operationClaims('The check reports "removed `a.js`" wrongly.').length, 0);
  assert.equal(operationClaims("```\nremoved `a.js`\n```").length, 0);
  assert.equal(operationClaims("We should remove `foo` soon.").length, 0);
  assert.equal(operationClaims("Removed `foo` and added `src/bar.js`.").length, 2);
});

test("messages in other languages are not read by these checks, so they pass silently", () => {
  const base = { "src/old.js": "old\n", "src/api.js": API };
  const f = check("feat: `src/old.js` eklendi, kimlik doğrulama kaldırıldı, testler eklendi", base, { "src/old.js": null });
  assert.deepEqual(codes(f), ["diff-tests-missing"].filter(() => false));
  assert.deepEqual(codes(check("機能: `src/old.js` を追加し、テストを追加しました", base, { "src/old.js": null })), []);
  assert.deepEqual(codes(check("功能：添加了 `src/old.js`，并添加了测试", base, { "src/old.js": null })), []);
});

test("outside a repository the error says what to do instead of printing a git command line", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-norepo-"));
  try {
    writeFileSync(join(dir, "msg.txt"), "fix: a\n\nFor the customer:\nWhat changed: A thing.\nWhy it matters: A reason.\n");
    const out = execFileSync(process.execPath, [cli, "check", "msg.txt", "--diff"], { cwd: dir, encoding: "utf8", env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(dir) } });
    assert.match(out, /--diff could not read the change: not a git repository/);
    assert.match(out, /run it inside the repository, or leave --diff off/);
    assert.ok(!/Command failed/.test(out));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--strict turns a mismatch the change proves into an error, and nothing else", () => {
  const { dir, git } = repo({ "src/old.js": "old\n" }, { "src/old.js": null });
  try {
    git("commit", "--quiet", "-m", "delete old");
    const msg = join(dir, "m.txt");
    const run = (text, ...extra) => {
      writeFileSync(msg, `${text}\n\nFor the customer:\nWhat changed: A thing.\nWhy it matters: A reason.\n`);
      const r = spawnSync(process.execPath, [cli, "check", msg, "--diff", "HEAD~1", ...extra], { cwd: dir, encoding: "utf8" });
      return { code: r.status, out: r.stdout + r.stderr };
    };
    // Default: the same mismatch is a warning and the run exits 0.
    assert.equal(run("feat: added `src/old.js`").code, 0);
    // Strict: an error, exit 1; --warn still wins.
    const strict = run("feat: added `src/old.js`", "--strict");
    assert.equal(strict.code, 1);
    assert.match(strict.out, /error the message says it added `src\/old\.js`/);
    assert.equal(run("feat: added `src/old.js`", "--strict", "--warn").code, 0);
    // A count the change contradicts is not proof of anything wrong: still a warning.
    assert.equal(run("Changed 5 files.", "--strict").code, 0);
    // Strict without --diff is a usage error, not a silent no-op.
    const bare = spawnSync(process.execPath, [cli, "check", msg, "--strict"], { cwd: dir, encoding: "utf8" });
    assert.equal(bare.status, 2);
    assert.match(bare.stderr, /--strict needs --diff/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Each case below is a shape found by running the checker over 4,796 real commits of eight public
// repositories (express, flask, fastify, requests, ripgrep, gin, execa, vite), where it reported
// something wrong about a message that was right.
test("real-commit false alarms stay fixed", () => {
  const one = { "src/a.js": "a\n" };
  const edit = { "src/a.js": "b\n" };
  const tests = (m, base = one, change = edit) => codes(check(m, base, change));

  // fastify: a pull request template's unchecked item and its instructions are not claims.
  const template = "docs: fix a link\n\n<!--\nBug fixes and new features should include tests and possibly benchmarks.\n-->\n\n#### Checklist\n\n- [ ] tests and/or benchmarks are included\n- [x] documentation is changed or added\n";
  assert.deepEqual(tests(template), []);
  // ...but a ticked item is a claim.
  assert.deepEqual(tests("fix: a\n\n- [x] tests added"), ["diff-tests-missing"]);

  // ripgrep, gin, fastify, requests: "tests" the sentence does not say were added.
  for (const m of ["ci: add support for a target. This includes running tests and binary artifacts.", "ci: add support to test release candidates", "Update publish workflow and add test pypi option", "Add `-race` flag to the test-tags list"]) {
    assert.deepEqual(tests(m), [], m);
  }
  // The claims they must still catch.
  for (const m of ["Added tests.", "Add a regression test for the empty case.", "adds two new unit tests", "Wrote integration tests for it"]) {
    assert.deepEqual(tests(m), ["diff-tests-missing"], m);
  }

  // execa: type tests live in test-d/ and *.test-d.ts.
  assert.deepEqual(tests("Add type tests for `$`", one, { "test-d/stdin.test-d.ts": "expectType<string>(x);\n" }), []);
  // ripgrep: a Rust test written inside the source file.
  assert.deepEqual(tests("searcher: add a test for the buffer", { "src/lib.rs": "fn a() {}\n" }, { "src/lib.rs": "fn a() {}\n#[test]\nfn it_works() {}\n" }), []);
  assert.deepEqual(tests("searcher: add a test for the buffer", { "src/lib.rs": "fn a() {}\n" }, { "src/lib.rs": "fn b() {}\n" }), ["diff-tests-missing"]);

  // fastify: a comment typo in a test file is a comment-only change; a code change is not.
  const t = { "test/a.test.js": "// recieve\nrun();\n" };
  assert.deepEqual(codes(check("test: fix typo in comment\n\nComment-only change.", t, { "test/a.test.js": "// receive\nrun();\n" })), []);
  assert.deepEqual(codes(check("test: fix typo in comment\n\nComment-only change.", t, { "test/a.test.js": "// receive\nrun2();\n" })), ["diff-docs-only-mismatch"]);

  // dependency bots: a URL's path is not a file in the repository.
  assert.deepEqual(tests("Bump x\n\nRelease notes: https://github.com/x/some-action/blob/main/CHANGELOG.md and https://github.com/x/y/compare/abc...def"), []);
  assert.deepEqual(codes(check("Touched `src/gone.ts`.", one, edit)), ["diff-path-missing"]);

  // gin: a squash that removes and re-adds the same name has no single direction.
  const sq = check("- Remove `Refactor` category\n- Add `Refactor` category again", { "c.yaml": "a\n" }, { "c.yaml": "a\ntitle: Refactor\n" });
  assert.deepEqual(codes(sq), []);

  // ripgrep: a hope is not a claim, and a bare fix of a document is a document fix.
  const lib = { "src/lib.rs": "pub fn a() {}\npub fn b() {}\n" };
  assert.deepEqual(codes(check("refactor: x\n\n(We can do it later in a backwards compatible fashion.)", lib, { "src/lib.rs": "pub fn a() {}\n" })), []);
  assert.deepEqual(codes(check("refactor: x\n\nThis change is backwards compatible.", lib, { "src/lib.rs": "pub fn a() {}\n" })), ["diff-breaking-export-removed"]);
  for (const m of ["fix syntax", "fix release date", "Fix function argument name"]) {
    assert.deepEqual(codes(check(m, { "docs/a.rst": "a\n" }, { "docs/a.rst": "b\n" })), [], m);
  }
  // requirements-dev.txt is not documentation.
  assert.deepEqual(codes(check("Fixed the crash on install", { "requirements-dev.txt": "a\n" }, { "requirements-dev.txt": "b\n" })), []);
});

test("held-out false alarms (tokio, cobra, commander, httpx) stay fixed", () => {
  const one = { "src/a.rs": "a\n" };
  const edit = { "src/a.rs": "b\n" };
  // tokio: "drop" is releasing a value, and a revert describes the commit it undoes.
  assert.deepEqual(codes(check("io: drop `DuplexStream` wakers outside the lock", one, { "src/a.rs": "b\nDuplexStream\n" })), []);
  assert.deepEqual(codes(check('time: revert "remove the runtime handle"\n\nCommit af4f removed the `Drop` implementations.', one, { "src/a.rs": "b\nimpl Drop for X {}\n" })), []);
  // tokio: "the test I added in #7431" is the past, not this change.
  assert.deepEqual(codes(check("test: remove `churn()` task\n\nThe `lifo_stealable` test I added in #7431 spawns a task.", one, edit)), []);
  // commander: *-tests.ts is a test file; cobra: "security fixes and bug patches" is not a fix claim.
  assert.deepEqual(codes(check("Add tests for the typings", { "typings/commander-tests.ts": "a\n" }, { "typings/commander-tests.ts": "a\nb\n" })), []);
  assert.deepEqual(codes(check("Cobra User Contract\n\nSet a goal for releases, security fixes and bug patches.", { "CONDUCT.md": "a\n" }, { "CONDUCT.md": "b\n" })), []);
  assert.deepEqual(codes(check("Fixed the null pointer crash", { "CONDUCT.md": "a\n" }, { "CONDUCT.md": "b\n" })), ["diff-fix-docs-only"]);
  // httpx: tests added to a source distribution are packaged, not written.
  assert.deepEqual(codes(check("Add tests and requirements.txt to sdist", one, edit)), []);
  // Paths that are not files here: relative, host-first, version ranges.
  for (const m of ["Use `./dist/node/index.cjs` for main", "Migrate from gopkg.in/yaml.v3 to go.yaml.in/yaml/v3", "Apply v1.20.0/v1.21.0 notes", "Backport to release/7.x", "See ../helpers/AxiosURLSearchParams.js"]) {
    assert.deepEqual(codes(check(m, one, edit)), [], m);
  }
});

test("a file count in a sentence about how a future change goes is not a claim (found in a recorded eval commit)", () => {
  const two = { "src/a.js": "a\n", "src/b.js": "b\n" };
  const chg = { "src/a.js": "a2\n", "src/b.js": "b2\n" };
  assert.deepEqual(codes(check("Adding a rule means a new file; remove a rule by editing one file and one line.", two, chg)), []);
  assert.deepEqual(codes(check("Changed 5 files.", two, chg)), ["diff-file-count-mismatch"]);
});

test("a deleted or renamed file the message names is not reported as an unresolved citation", () => {
  const { dir, git } = repo({ "src/old.js": "old\n", "src/keep.js": "k\n" }, { "src/old.js": null });
  try {
    git("commit", "--quiet", "-m", "delete old");
    const msg = join(dir, "m.txt");
    const run = (text) => {
      writeFileSync(msg, `${text}\n\nFor the customer:\nWhat changed: A thing.\nWhy it matters: A reason.\n`);
      return spawnSync(process.execPath, [cli, "check", msg, "--diff", "HEAD~1"], { cwd: dir, encoding: "utf8" }).stdout;
    };
    assert.ok(!/does not resolve/.test(run("chore: removed `src/old.js`")));
    // A path that never existed is still reported.
    assert.match(run("chore: removed `src/never.js`"), /cites src\/never\.js, which does not resolve/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Third corpus (pallets/jinja, sharkdp/fd, spf13/viper, sindresorhus/got, colinhacks/zod, pytest-dev/pytest), 3,600
// commits, run on 2 November 2026 while still held out. It exposed these shapes; each was a message that was right.
test("third-corpus false alarms stay fixed (jinja, pytest, zod, got)", () => {
  const base = { "src/_pytest/mark/structures.py": "a\n", "src/x.py": "a\n", "src/core/regexes.ts": "r\n" };
  const edit = { "src/x.py": "b\n" };
  // A path written without its leading directories names the file that exists under them.
  assert.deepEqual(codes(check("refactor: reuse the helper from `mark/structures.py`", base, edit)), []);
  assert.deepEqual(codes(check("fix: tighten core/regexes.ts", base, edit)), []);
  // ...but a suffix that matches no file is still a broken reference.
  assert.deepEqual(codes(check("refactor: reuse the helper from `mark/gone.py`", base, edit)), ["diff-path-missing"]);
  // Not paths: alternatives of dotted names, extension lists, a package version, an ellipsis, a branch name with a version.
  for (const m of ["Avoid `os.open/os.scandir` here", "Fix z.input/z.output inference", "Emit .js/.cjs/.d.ts files", "Sync @zod/mini@4.5.4", "Expected .../broken.html", "Merge from pytest-dev/release-9.1.1"]) {
    assert.deepEqual(codes(check(m, base, edit)), [], m);
  }

  // jinja and zod: "docs only" read inside a longer phrase is not a claim about this change.
  const src = { "src/x.py": "a\n" };
  const srcEdit = { "src/x.py": "b\n" };
  for (const m of ["Add a note\n\nInternal-only doc; not published.", "Add a note\n\nThe section is currently its only documentation.", "skip code tests when only docs change", "use a cache if only docs change"]) {
    assert.deepEqual(codes(check(m, src, srcEdit)), [], m);
  }
  // zod: "no source changes" is about source; test files may change. "no code changes" still counts tests.
  const t = { "test/a.test.js": "a\n", "src/a.js": "a\n" };
  const tEdit = { "test/a.test.js": "b\n" };
  assert.deepEqual(codes(check("test: align assertions\n\nNo source changes; only test assertions.", t, tEdit)), []);
  assert.deepEqual(codes(check("test: align assertions\n\nNo code changes.", t, tEdit)), ["diff-docs-only-mismatch"]);
  assert.deepEqual(codes(check("test: align assertions\n\nNo source changes.", t, { "src/a.js": "b\n" })), ["diff-docs-only-mismatch"]);
  // zod: a "docs only" change whose code lines are all comments is documentation only.
  assert.deepEqual(codes(check("docs: explain optin\n\nThis keeps it docs-only.", { "src/a.js": "a\n" }, { "src/a.js": "a\n// optin is read here\n" })), []);
  assert.deepEqual(codes(check("docs: explain optin\n\nThis keeps it docs-only.", { "src/a.js": "a\n" }, { "src/a.js": "a\nrun();\n" })), ["diff-docs-only-mismatch"]);

  // zod: a relative clause about someone else's removal ("draft-2020-12 (which removed `additionalItems`)") is not this change's claim.
  assert.deepEqual(
    codes(check("fix: emit `items: false` for draft-2020-12 (which removed `additionalItems`)", { "src/a.js": "a\n" }, { "src/a.js": "a\nadditionalItems;\n" })),
    [],
  );
  assert.deepEqual(codes(check("fix: removed `additionalItems`", { "src/a.js": "a\n" }, { "src/a.js": "a\nadditionalItems;\n" })), ["diff-symbol-direction"]);
});
