import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { notes } from "../bin/notes.mjs";

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), "customer-notes-"));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  git("init", "--quiet", "-b", "main");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  const commit = (name, message) => {
    writeFileSync(join(cwd, name), name);
    git("add", name);
    git("commit", "--quiet", "-m", message);
  };
  return { cwd, git, commit };
}

test("notes render What changed with Why it matters nested and count missing blocks", () => {
  const f = fixture();
  try {
    f.commit("first.txt", "feat: export bookings\n\nFor the customer:\nWhat changed: Accountants can download monthly bookings.\nWhy it matters: They no longer copy each row by hand.");
    f.commit("second.txt", "chore: internal cleanup");
    const output = notes("main", f.cwd);
    assert.match(output, /- Accountants can download monthly bookings\./);
    assert.match(output, /\n  - Why it matters: They no longer copy each row by hand\./);
    assert.match(output, /1 commits without a block/);
  } finally {
    rmSync(f.cwd, { recursive: true, force: true });
  }
});

test("notes read configured customer-block headings", () => {
  const f = fixture();
  try {
    mkdirSync(f.cwd, { recursive: true });
    writeFileSync(join(f.cwd, ".product-engineer.json"), JSON.stringify({ headings: { block: "For customers:", what: "Changed:", why: "Benefit:" } }));
    f.commit("first.txt", "feat: export\n\nFor customers:\nChanged: People can download reports.\nBenefit: They save time.");
    const output = notes("main", f.cwd);
    assert.match(output, /- People can download reports\./);
    assert.match(output, /  - Benefit: They save time\./);
  } finally {
    rmSync(f.cwd, { recursive: true, force: true });
  }
});

test("notes reject an invalid range with a useful error", () => {
  const f = fixture();
  try {
    assert.throws(() => notes("missing-ref..HEAD", f.cwd), /cannot read commit range/);
  } finally {
    rmSync(f.cwd, { recursive: true, force: true });
  }
});
