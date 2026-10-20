// `product-engineer check --format json`: the shape, that the exit code does not change, that standard
// output is one JSON document even with --comment, and that every finding has a stable code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyse } from "../bin/check.mjs";
import { crossCheck, readDiff } from "../bin/diff.mjs";
import { toJson, renderJson } from "../bin/json-report.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "bin", "check.mjs");
const fixture = (f) => join(root, "test", "fixtures", f);
const runCli = (args, input) => spawnSync("node", [cli, ...args], { cwd: root, encoding: "utf8", input });

test("a message with the block prints one object with ok, findings and readability, and exits 0", () => {
  const r = runCli(["check", fixture("with-block.txt"), "--format", "json"]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(out), ["ok", "findings", "readability"]);
  assert.equal(out.ok, true);
  assert.ok(Array.isArray(out.findings) && out.findings.length > 0);
  for (const f of out.findings) {
    assert.deepEqual(Object.keys(f), ["level", "code", "message"]);
    assert.match(f.code, /^[a-z]+(-[a-z]+)*$/);
  }
  assert.ok(out.findings.some((f) => f.code === "block-present" && f.level === "ok"));
  assert.equal(out.readability.name, "Flesch");
  assert.equal(typeof out.readability.score, "number");
});

test("a message without the block prints ok false and exits 1, the same as text mode", () => {
  const json = runCli(["check", fixture("without-block.txt"), "--format", "json"]);
  const text = runCli(["check", fixture("without-block.txt")]);
  assert.equal(json.status, 1);
  assert.equal(json.status, text.status);
  const out = JSON.parse(json.stdout);
  assert.equal(out.ok, false);
  assert.ok(out.findings.some((f) => f.level === "error" && f.code === "block-missing"));
  assert.equal(out.readability, null);
});

test("--warn keeps the exit code 0 and ok true, as in text mode", () => {
  const r = runCli(["check", fixture("without-block.txt"), "--format", "json", "--warn"]);
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.ok, true);
  assert.ok(out.findings.some((f) => f.level === "warn" && f.code === "block-missing"));
});

test("a skipped message (a merge) reports ok with its own code and no readability", () => {
  const r = runCli(["check", "-", "--format", "json"], "Merge branch 'x' into main\n");
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.findings.map((f) => f.code), ["block-not-required"]);
  assert.equal(out.readability, null);
});

test("an unknown format is a usage error that names all three", () => {
  const r = runCli(["check", fixture("with-block.txt"), "--format", "xml"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /text, github or json/);
});

test("--help documents json", () => {
  assert.match(execFileSync("node", [cli, "--help"], { encoding: "utf8" }), /text \(default\), github or json/);
});

test("--comment without a pull request still keeps standard output a single JSON document", () => {
  const r = runCli(["check", fixture("with-block.txt"), "--format", "json", "--comment"]);
  assert.equal(r.status, 2);
  assert.equal(r.stdout.trim().startsWith("{"), true);
  assert.doesNotThrow(() => JSON.parse(r.stdout));
});

test("toJson: ok follows the errors, unlabelled findings fall back to other, readability defaults to null", () => {
  assert.deepEqual(toJson({ findings: [{ level: "warn", message: "w", code: "x-y" }] }), { ok: true, findings: [{ level: "warn", code: "x-y", message: "w" }], readability: null });
  assert.equal(toJson({ findings: [{ level: "error", message: "e" }] }).ok, false);
  assert.equal(toJson({ findings: [{ level: "error", message: "e" }] }).findings[0].code, "other");
  assert.equal(toJson({ findings: [{ level: "error", message: "e" }] }, { warn: true }).ok, true);
  assert.equal(JSON.parse(renderJson({ findings: [] })).ok, true);
});

const BLOCK = "For the customer:\nWhat changed: A.\nWhy it matters: B.\n";

/** One message per kind of finding analyse() and the cross-checks can make. */
const CORPUS = [
  `feat: x\n\n${BLOCK}\nNot shipped:\n- a thing: not now\n`,
  "feat: x\n",
  "feat: x\n\nFor the customer:\nWhy it matters: B.\n",
  "feat: x\n\nFor the customer:\nWhat changed: A.\n",
  "feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\nAutomation effect:\n",
  "feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\nAutomation effect: The copy-paste is gone.\n",
  "feat: x\n\nFor the customer:\nWhat changed: The webhook is now idempotent.\nWhy it matters: B.\n",
  "feat: x\n\nFor the customer:\nWhat changed: The webhook is idempotent (doing it twice has the same result as once).\nWhy it matters: B.\n",
  "fix: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: All 42 tests pass, so it works.\n",
  `feat: x\n\n${BLOCK}\nNot shipped:\n`,
  `feat: x\n\n${BLOCK}\nNot shipped:\n- just a thing\n`,
  `feat: x\n\nWe made it 40 percent faster.\n\n${BLOCK}`,
  `feat: x\n\nChecked docs/install.md and docs/does-not-exist.md.\n\n${BLOCK}`,
  `feat: x\n\nChecked docs/install.md.\n\n${BLOCK}`,
  "Merge branch 'x'\n",
];

test("every finding the checker can make carries a code", () => {
  const seen = new Set();
  for (const message of CORPUS) {
    for (const f of analyse(message, { cwd: root }).findings) {
      assert.ok(f.code, `no code on [${f.level}] ${f.message}`);
      seen.add(f.code);
    }
  }
  for (const code of ["block-missing", "what-changed-missing", "block-present", "why-present", "why-missing", "automation-omitted", "automation-empty", "automation-present", "jargon-unexplained", "jargon-explained", "tests-as-evidence", "readability", "not-shipped-empty", "not-shipped-format", "not-shipped-ok", "number-without-method", "references-none", "references-resolved", "references-broken", "block-not-required"]) {
    assert.ok(seen.has(code), `the corpus never produced ${code}`);
  }
});

test("every finding the diff cross-check can make carries a code", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-json-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  try {
    git("init", "--quiet", "-b", "main");
    git("config", "user.email", "t@example.com");
    git("config", "user.name", "T");
    writeFileSync(join(dir, "README.md"), "# fixture\n");
    git("add", "-A");
    git("commit", "--quiet", "-m", "init");
    const check = (message) => crossCheck(message, readDiff({ cwd: dir }), { cwd: dir });
    const codes = new Set();
    const collect = (message) => check(message).forEach((f) => { assert.ok(f.code, `no code on [${f.level}] ${f.message}`); codes.add(f.code); });

    collect("docs: x\n\nThe change touches no files.\n"); // nothing staged
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "a.js"), "export const a = 1;\n");
    git("add", "-A");
    collect("feat: x\n\nI added tests for it. This is documentation only. It changes 2 files. See src/gone/missing.js.\n");
    mkdirSync(join(dir, "test"));
    writeFileSync(join(dir, "test", "a.test.js"), "x\n");
    writeFileSync(join(dir, "docs.md"), "x\n");
    git("add", "-A");
    collect("feat: x\n\nI added tests for it. It changes 3 files.\n");
    git("rm", "-q", "-f", "src/a.js", "test/a.test.js");
    collect("docs: x\n\nThis is documentation only.\n");

    for (const code of ["diff-empty", "diff-checked", "diff-tests-missing", "diff-tests-found", "diff-docs-only-mismatch", "diff-docs-only-ok", "diff-file-count-mismatch", "diff-file-count-ok", "diff-path-missing"]) {
      assert.ok(codes.has(code), `the cross-check never produced ${code}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--diff outside a repository warns with its own code in json", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-nogit-"));
  try {
    writeFileSync(join(dir, "m.txt"), readFileSync(fixture("with-block.txt")));
    const r = spawnSync("node", [cli, "check", join(dir, "m.txt"), "--diff", "--format", "json"], { cwd: dir, encoding: "utf8", env: { ...process.env, GIT_CEILING_DIRECTORIES: tmpdir() } });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(JSON.parse(r.stdout).findings.some((f) => f.code === "diff-unreadable"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A fake GitHub API with one pull request (number 8, no block) and an empty comment list. */
function fakeApi() {
  const server = createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      const send = (status, body) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      const url = req.url.split("?")[0];
      if (req.method === "GET" && url === "/repos/o/r/pulls/8") return send(200, { number: 8, body: "feat: no block here" });
      if (req.method === "GET" && url === "/repos/o/r/issues/8/comments") return send(200, []);
      if (req.method === "POST" && url === "/repos/o/r/issues/8/comments") return send(201, { id: 101 });
      send(404, { message: "no route" });
    });
  });
  server.keepAliveTimeout = 100;
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

test("--pr with --comment and --format json keeps standard output one JSON document; the comment notice goes to standard error", async () => {
  const api = await fakeApi();
  try {
    const env = { PATH: process.env.PATH, ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}), GITHUB_TOKEN: "t", GITHUB_REPOSITORY: "o/r", GITHUB_API_URL: `http://127.0.0.1:${api.port}` };
    const r = await new Promise((resolve) => {
      const child = spawn(process.execPath, [cli, "check", "--pr", "8", "--comment", "--format", "json"], { env, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (c) => (stdout += c));
      child.stderr.on("data", (c) => (stderr += c));
      child.on("close", (status) => resolve({ status, stdout, stderr }));
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.equal(JSON.parse(r.stdout).ok, false);
    assert.match(r.stderr, /comment created on pull request #8/);
  } finally {
    api.server.close();
  }
});
