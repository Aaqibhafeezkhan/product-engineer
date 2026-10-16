import { test } from "node:test";
import assert from "node:assert/strict";
import { metrics, extras } from "../evals/score.mjs";

const nm = (final) => metrics.numbersWithMethod.test({ final });

test("numbers inside code spans and fences do not count", () => {
  assert.equal(nm("Set `retries = 3` and moved on."), true);
  assert.equal(nm("```\nconst n = 42;\n```\nAll good."), true);
});

test("versions, issue numbers, years and hashes are not bare numbers", () => {
  assert.equal(nm("Bumped to v1.2.3 for #42 in 2026 at commit 9f3a2b1c."), true);
});

test("a bare count is still caught, a counted one is not", () => {
  assert.equal(nm("There are 12 customers affected."), false);
  assert.equal(nm("I counted 12 customers in customers.json, out of 40."), true);
});

test("markdown files no longer break scope, and are reported separately", () => {
  const sample = { changed: ["src/a.js", "README.md"], allowed: ["src/a.js"] };
  assert.equal(metrics.scopeRespected.test(sample), true);
  assert.equal(extras.documentedElsewhere.test(sample), true);
  assert.equal(extras.documentedElsewhere.test({ changed: ["src/a.js"], allowed: ["src/a.js"] }), false);
  assert.equal(metrics.scopeRespected.test({ changed: ["src/b.js"], allowed: ["src/a.js"] }), false);
});

import { bootstrapDelta, mulberry32 } from "../evals/score.mjs";

test("bootstrapDelta is seeded and brackets an obvious effect", () => {
  const deltas = [1, 1, 1, 0, 1, 1, 1, 1];
  const a = bootstrapDelta(deltas, 2000, 7);
  const b = bootstrapDelta(deltas, 2000, 7);
  assert.deepEqual(a, b);
  assert.ok(a.low > 0 && a.high <= 1 && a.mean > 0.8);
});

test("mulberry32 is deterministic", () => {
  const r1 = mulberry32(1), r2 = mulberry32(1);
  assert.equal(r1(), r2());
});

import { table } from "../evals/score.mjs";

test("table refuses runs of different skills in one table", () => {
  const row = (condition, skill) => ({ task: "01", condition, run: 1, results: {}, extras: {}, meta: { skill }, final: "", commit: "", changed: [], allowed: [] });
  assert.throws(() => table([row("skill", "customer-block"), row("skill", "release-notes")]), /different skills/);
  assert.doesNotThrow(() => table([row("bare", null), row("skill", "customer-block")]));
  // A run recorded before meta.json named the skill installed the core pack, so it tables with one that names it.
  assert.doesNotThrow(() => table([row("skill", undefined), row("skill", "product-engineer")]));
  assert.throws(() => table([row("skill", undefined), row("skill", "customer-block")]), /different skills/);
});
