// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { crossCheck } from "../bin/diff.mjs";
import { filePath, operation, extraTests, extraDocsOnly, fileCount, MUTATIONS } from "../evals/baseline/mutate.mjs";

const diffOf = (...paths) => ({ files: paths.map((p) => ({ path: p, added: 5, removed: 1, binary: false })), range: "HEAD~1" });
const warns = (text, diff) => crossCheck(text, diff, { cwd: process.cwd() }).filter((f) => f.level === "warn");

test("each mutation produces the inconsistency it claims", () => {
  const src = diffOf("src/a.ts", "src/b.ts");

  const p = filePath("Rewrote the loop in `src/a.ts` so it reads.", src);
  assert.ok(p && !p.includes("src/a.ts"), p);
  assert.ok(warns(p, src).some((w) => /names? a path/.test(w.message)), JSON.stringify(warns(p, src)));

  const t = extraTests("Rewrote the loop so it reads.", src);
  assert.ok(warns(t, src).some((w) => /tests were added/.test(w.message)));

  const d = extraDocsOnly("Rewrote the loop so it reads.", src);
  assert.ok(warns(d, src).some((w) => /documentation only/.test(w.message)));

  const c = fileCount("Rewrote the loop so it reads.", src);
  assert.ok(warns(c, src).some((w) => /the change has 2/.test(w.message)), JSON.stringify(warns(c, src)));

  const o = operation("Added the retry path.", src);
  assert.equal(o, "Removed the retry path.");
});

test("a mutation refuses a commit it cannot apply to", () => {
  const src = diffOf("src/a.ts");
  // No path named, so there is nothing to misname.
  assert.equal(filePath("Rewrote the loop so it reads.", src), null);
  // No operation verb to swap.
  assert.equal(operation("Rewrote the loop so it reads.", src), null);
  // The message already talks about tests, so appending a claim proves nothing.
  assert.equal(extraTests("Tests cover the loop now.", src), null);
  // A test file gains lines, so the claim would be true.
  assert.equal(extraTests("Rewrote the loop.", diffOf("test/a.test.mjs")), null);
  // Documentation only, so the appended claim would be true.
  assert.equal(extraDocsOnly("Rewrote the page.", diffOf("README.md")), null);
  // A count is already stated.
  assert.equal(fileCount("Touched three files.", src), null);
});

test("operation is in the corpus and is not expected to be caught", () => {
  const entry = MUTATIONS.find((m) => m.type === "operation");
  assert.equal(entry?.reachable, false);
  const src = diffOf("src/a.ts");
  const mutated = operation("Added the retry path.", src);
  assert.deepEqual(warns(mutated, src), [], "no check reads operation verbs; if this fires, the results table is wrong");
});

// Both of the following were false alarms on real commits in this repository, found by the
// baseline run and fixed in bin/diff.mjs. They are here so the fixes cannot regress.

test("a file count is only a claim when the change verb governs it", () => {
  const three = diffOf("a.ts", "b.ts", "c.ts");
  // The verb follows the count and belongs to a different event.
  assert.deepEqual(warns("A run left five files modified.", three), []);
  // The verb comes from the "What changed:" heading; the count is a later, unrelated clause.
  assert.deepEqual(warns("What changed: Teams that want it can install one file and be done.", three), []);
  // The genuine shape still reports.
  assert.ok(warns("This change updates 7 files.", three).some((w) => /the change has 3/.test(w.message)));
  assert.ok(warns("Updates two files.", three).some((w) => /the change has 3/.test(w.message)));
});

test("a plan that describes tests is not a claim that tests were added", () => {
  const src = diffOf("docs/plan.md");
  assert.deepEqual(warns("The design now has a plan with the tests written out.", src), []);
  // A plain claim on a change with no test file still reports.
  assert.ok(warns("Added regression tests covering this.", diffOf("src/a.ts")).some((w) => /tests were added/.test(w.message)));
});

test("a hyphenated identifier that contains a claim is a name, not a claim", () => {
  const src = diffOf("src/a.ts", "src/b.ts");
  // The corpus type name `extra-docs-only` in a message about the corpus was the third false
  // alarm this run found: "docs-only" sat inside a longer token and was read as an assertion.
  assert.deepEqual(warns("Recall is 100% on extra-docs-only and file-count.", src), []);
  // The claim itself still reports, hyphenated or spaced.
  assert.ok(warns("This change is documentation only.", src).some((w) => /documentation only/.test(w.message)));
  assert.ok(warns("A docs-only change.", src).some((w) => /documentation only/.test(w.message)));
});

test("a table cell escapes the backslash before the pipe", async () => {
  // Escaping only `|` turned a message holding `a\|b` into `a\\|b`: an escaped backslash
  // followed by a bare pipe, which ends the cell and shifts every column after it.
  const { tableCell } = await import("../evals/baseline/markdown.mjs");
  assert.equal(tableCell("a|b"), "a\\|b");
  assert.equal(tableCell("a\\|b"), "a\\\\\\|b");
  assert.equal(tableCell("C:\\path"), "C:\\\\path");
  assert.equal(tableCell("names `src/a.ts`, which the change does not touch"), "names `src/a.ts`, which the change does not touch");
});
