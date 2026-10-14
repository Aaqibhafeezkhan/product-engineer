import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rules } from "../integrations/commitlint/index.mjs";
import config from "../integrations/commitlint/config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("commitlint rule passes a message with the block and fails one without", () => {
  const [okPassed] = rules["customer-block"]({ raw: readFileSync(join(root, "test/fixtures/with-block.txt"), "utf8") }, "always");
  assert.equal(okPassed, true);
  const [passed, message] = rules["customer-block"]({ raw: "feat: no block\n" }, "always");
  assert.equal(passed, false);
  assert.match(message, /For the customer/);
  const [mergePassed] = rules["customer-block"]({ raw: "Merge branch 'x'\n" }, "always");
  assert.equal(mergePassed, true);
});

test("the shareable config enables the rule as an error", () => {
  assert.deepEqual(config.rules["customer-block"], [2, "always"]);
  assert.equal(typeof config.plugins[0].rules["customer-block"], "function");
});

test("the pre-commit entry runs check on the message file", () => {
  // Forward slashes: the script takes its own directory with `dirname "$0"`, and a Windows path
  // with backslashes is not one that every sh splits the same way.
  const posix = (p) => p.replaceAll("\\", "/");
  const script = posix(join(root, "scripts/pre-commit-check.sh"));
  const r = spawnSync("sh", [script, posix(join(root, "test/fixtures/without-block.txt"))], { encoding: "utf8" });
  assert.equal(r.status, 1, r.stderr);
  const ok = spawnSync("sh", [script, posix(join(root, "test/fixtures/with-block.txt"))], { encoding: "utf8" });
  assert.equal(ok.status, 0);
});
