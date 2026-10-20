// @ts-check
// Ties the public surfaces to the data files their figures came from. A figure typed into a page
// and not derived here is how the README, the site and docs/COMPARISON.md came to show different
// tables for the same model on 2026-10-20.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (/** @type {string} */ p) => readFileSync(join(root, p), "utf8");
const skills = JSON.parse(read("evals/comparison/skills-results.json"));
const arm = (/** @type {string} */ id) => skills.arms.find((/** @type {{id: string}} */ a) => a.id === id);
const signed = (/** @type {number} */ n) => (n >= 0 ? `+${n}` : String(n));

const STALE = [
  ["README.md", "200 commits deep"],
  ["README.md", "last five commits"],
  ["README.md", "four years as a founding engineer"],
  ["site/index.html", "18 other agents"],
  ["site/index.html", "about 60% more turns"],
  ["llms.txt", "8 tasks x 2 conditions"],
  ["llms.txt", "Every figure in the README comes from a real run"],
];

test("claims found false or unverifiable on 2026-10-20 stay out", () => {
  for (const [file, text] of STALE) assert.ok(!read(file).includes(text), `${file} still says: ${text}`);
});

test("the README baseline sentence is built from evals/baseline/RESULTS.md", () => {
  const b = read("evals/baseline/RESULTS.md");
  const run = b.match(/`([0-9a-f]{7,40})`, (\d+) non-merge commits with file changes/);
  const scored = b.match(/\| commits scored \| (\d+) \|/);
  assert.ok(run && scored, "evals/baseline/RESULTS.md changed shape; update this test");
  const expected = `at \`${run[1]}\`: ${run[2]} non-merge commits with file changes, ${scored[1]} of them scored`;
  assert.ok(read("README.md").includes(expected), `README.md must contain: ${expected}`);
});

test("the site table is the run in evals/comparison/skills-results.json", () => {
  const html = read("site/index.html");
  const bare = arm("bare");
  const ours = arm("product-engineer");
  assert.equal(skills.metrics.length, 5);
  for (const m of skills.metrics) {
    const b = bare.counts[m.key];
    const s = ours.counts[m.key];
    const row = `<td>${m.title}</td><td>${b} / ${bare.n}</td><td>${s} / ${ours.n}</td><td>${signed(s - b)}</td>`;
    assert.ok(html.includes(row), `site/index.html is missing: ${row}`);
  }
});

test("the site states the model dependence next to the table", () => {
  const html = read("site/index.html");
  assert.ok(html.includes("claude-haiku-4-5"));
  assert.ok(html.includes("no clear effect"));
});

test("llms.txt points at the per-model results and says the result depends on the model", () => {
  const t = read("llms.txt");
  assert.ok(t.includes("evals/RESULTS-models.md"));
  assert.match(t, /depend[s]? on the model/);
});
