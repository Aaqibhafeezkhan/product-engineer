import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("docs/proof.md contains the real output of scripts/proof-cases.sh, unedited", () => {
  const out = execFileSync("sh", [join(root, "scripts/proof-cases.sh")], { encoding: "utf8", cwd: root });
  const page = readFileSync(join(root, "docs/proof.md"), "utf8");
  assert.ok(page.includes(out), "docs/proof.md is out of date; regenerate the cases section with: sh scripts/proof-cases.sh");
  // The page shows a pass that is wrong, not only catches.
  assert.match(out, /Failure: a test file with no test in it/);
  assert.match(out, /ok {4}tests claimed and 1 test file gains lines/);
  assert.match(out, /Failure: a Turkish message is not read for claims/);
  // Each catch it shows is a warning, and what a diff cannot show is only listed.
  for (const re of [/warn {2}the message says tests were added/, /warn {2}the message says it added `src\/old\.js`; the change deletes/, /warn {2}the message says it removed `audit`/, /warn {2}the message says it fixes a bug/, /warn {2}the message says nothing breaks/, /info {2}claimed by the author and not checkable/]) {
    assert.match(out, re);
  }
});
