import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { GENERATED_MARKER, installHooks, uninstallHooks } from "../bin/hooks.mjs";

const tempDirs = [];
function repository() {
  const dir = mkdtempSync(join(tmpdir(), "product-engineer-hooks-"));
  tempDirs.push(dir);
  execFileSync("git", ["init", "-q"], { cwd: dir });
  return { dir, hooks: join(dir, ".git", "hooks") };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test("install writes an executable commit-msg hook that validates messages", () => {
  const { dir, hooks } = repository();
  const [path] = installHooks({ cwd: dir });
  assert.equal(realpathSync.native(path), realpathSync.native(join(hooks, "commit-msg")));
  const generated = readFileSync(new URL("../scripts/commit-msg", import.meta.url), "utf8");
  assert.equal(readFileSync(path, "utf8"), generated.replace(/^(#![^\n]*\n)/, `$1${GENERATED_MARKER}\n`));
  const valid = join(dir, "valid-message");
  writeFileSync(valid, "feat: useful change\n\nFor the customer:\nWhat changed: checkout is faster\nWhy it matters: customers finish sooner\n");
  execFileSync("sh", [path, valid], { cwd: dir });
  const invalid = join(dir, "invalid-message");
  writeFileSync(invalid, "feat: useful change\n");
  assert.throws(() => execFileSync("sh", [path, invalid], { cwd: dir, stdio: "pipe" }));
});


test("installed generated hook accepts headings configured for this repository", () => {
  const { dir } = repository();
  installHooks({ cwd: dir });
  writeFileSync(join(dir, ".product-engineer.json"), JSON.stringify({
    headings: { block: "Customer impact:", what: "Changed:" }
  }));
  const message = join(dir, "custom-message");
  writeFileSync(message, "feat: localised message\n\nCustomer impact:\nChanged: checkout is faster\n");
  execFileSync("sh", [join(dir, ".git", "hooks", "commit-msg"), message], { cwd: dir });
});

test("--prefill appends the empty block for ordinary messages", () => {
  const { dir, hooks } = repository();
  installHooks({ cwd: dir, prefill: true });
  const hook = join(hooks, "prepare-commit-msg");
  const message = join(dir, "COMMIT_EDITMSG");
  writeFileSync(message, "feat: useful change\n");
  execFileSync("sh", [hook, message, "template"], { cwd: dir });
  assert.match(readFileSync(message, "utf8"), /For the customer:\nWhat changed:\nWhy it matters:/);
});

test("prefill skips message, merge, and squash sources", () => {
  const { dir, hooks } = repository();
  installHooks({ cwd: dir, prefill: true });
  const hook = join(hooks, "prepare-commit-msg");
  for (const source of ["message", "merge", "squash"]) {
    const message = join(dir, `message-${source}`);
    writeFileSync(message, "existing message\n");
    execFileSync("sh", [hook, message, source], { cwd: dir });
    assert.equal(readFileSync(message, "utf8"), "existing message\n");
  }
});

test("install refuses foreign hooks unless forced", () => {
  const { dir, hooks } = repository();
  mkdirSync(hooks, { recursive: true });
  const path = join(hooks, "commit-msg");
  writeFileSync(path, "#!/bin/sh\necho user hook\n");
  assert.throws(() => installHooks({ cwd: dir }), /refusing to overwrite/);
  assert.match(readFileSync(path, "utf8"), /user hook/);
  installHooks({ cwd: dir, force: true });
  assert.match(readFileSync(path, "utf8"), new RegExp(GENERATED_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("uninstall removes only generated hooks", () => {
  const { dir, hooks } = repository();
  installHooks({ cwd: dir, prefill: true });
  const foreign = join(hooks, "pre-commit");
  writeFileSync(foreign, "#!/bin/sh\necho keep\n");
  assert.equal(uninstallHooks({ cwd: dir }).length, 2);
  assert.equal(existsSync(join(hooks, "commit-msg")), false);
  assert.equal(existsSync(join(hooks, "prepare-commit-msg")), false);
  assert.equal(existsSync(foreign), true);
});
