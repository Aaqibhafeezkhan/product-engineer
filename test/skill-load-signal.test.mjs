import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "evals", "skill-load-signal.mjs");

function run(dir, cond, n, { turns, cc, commit }) {
  const d = join(dir, "t1", cond, `run-${n}`);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "transcript.json"), JSON.stringify({ num_turns: turns, usage: { cache_creation_input_tokens: cc } }));
  writeFileSync(join(d, "commit.txt"), commit);
}

test("it separates skill runs with the block from runs without, against the bare mean of the same task", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-load-"));
  try {
    run(dir, "bare", 1, { turns: 6, cc: 1000, commit: "fix\n" });
    run(dir, "bare", 2, { turns: 8, cc: 3000, commit: "fix\n" });
    run(dir, "skill", 1, { turns: 10, cc: 5000, commit: "fix\n\nFor the customer:\nWhat changed: x\n" });
    run(dir, "skill", 2, { turns: 7, cc: 2000, commit: "fix\n" });
    const out = execFileSync(process.execPath, [script, dir], { encoding: "utf8" });
    assert.match(out, /commit has the block\s+n= 1\s+extra turns\s+3\.0\s+extra cache-creation tokens\s+3000\.0/);
    assert.match(out, /commit has no block\s+n= 1\s+extra turns\s+0\.0\s+extra cache-creation tokens\s+0\.0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
