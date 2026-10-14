// scripts/release-gate.mjs against a copy of this repository (tracked and not-ignored files). Every file named
// in scripts/versioned-files.json is changed in turn, and the gate must refuse each one. The list
// is read, not retyped, so a file added to it is tested without touching this file.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { versionedFiles, readVersion, writeVersion } from "../scripts/versioned-files.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

function copy() {
  const dir = mkdtempSync(join(tmpdir(), "release-gate-"));
  const tracked = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  for (const f of tracked) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    try {
      cpSync(join(root, f), join(dir, f));
    } catch {
      // A tracked file deleted in the working tree is not part of what the gate sees either.
    }
  }
  return dir;
}

// One copy for every test: each case restores what it changed. Writing a few hundred files is
// the slow part of this suite, so it is done once.
let dir;
before(() => {
  dir = copy();
});
after(() => rmSync(dir, { recursive: true, force: true }));

const gate = (cwd) => spawnSync(process.execPath, [join(root, "scripts", "release-gate.mjs")], { cwd, encoding: "utf8" });

test("the list names files that exist and whose pattern finds the package version", () => {
  const list = versionedFiles(root);
  assert.ok(list.length > 0, "scripts/versioned-files.json lists no file");
  for (const entry of list) assert.equal(readVersion(readFileSync(join(root, entry.path), "utf8"), entry), pkgVersion, entry.path);
});

test("the gate passes on the repository as it is, and fails when any one listed file disagrees", () => {
  const ok = gate(dir);
  assert.equal(ok.status, 0, ok.stderr);
  for (const entry of versionedFiles(root)) {
    const file = join(dir, entry.path);
    const original = readFileSync(file, "utf8");
    writeFileSync(file, writeVersion(original, entry, "9.9.9"));
    try {
      const r = gate(dir);
      assert.equal(r.status, 1, `${entry.path} changed to 9.9.9 and the gate still passed`);
      assert.match(r.stderr, new RegExp(`${entry.path.replaceAll(".", "\\.")} version is 9\\.9\\.9`));
    } finally {
      writeFileSync(file, original);
    }
  }
});

test("a listed file whose pattern matches nothing fails the gate", () => {
  const [entry] = versionedFiles(root);
  const file = join(dir, entry.path);
  const original = readFileSync(file, "utf8");
  writeFileSync(file, "no version here\n");
  try {
    const r = gate(dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /matched nothing/);
  } finally {
    writeFileSync(file, original);
  }
});
