// @ts-check
// Ties the public surfaces to the data files their figures came from. A figure typed into a page
// and not derived here is how the README, the site and docs/COMPARISON.md came to show different
// tables for the same model on 2026-10-20.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

const ALLOWED_TYPED = [
  "cat msg.txt",
  "product-engineer check msg.txt --diff",
  "git add test/total.test.js",
];

test("the tape records only the three named commands after Show, and the GIF is small", () => {
  const tape = read("docs/demo-diff.tape");
  assert.match(tape, /^Output docs\/demo-diff\.gif$/m);
  const shown = tape.split(/^Show$/m)[1];
  assert.ok(shown, "tape has no Show line");
  const typed = [...shown.matchAll(/^Type "(.*)" Enter$/gm)].map((m) => m[1]);
  assert.ok(typed.length >= 3);
  for (const t of typed) assert.ok(ALLOWED_TYPED.includes(t), `tape types a command that is not allowed: ${t}`);
  const size = statSync(join(root, "docs/demo-diff.gif")).size;
  assert.ok(size > 10_000 && size < 400_000, `docs/demo-diff.gif is ${size} bytes`);
});

test("the recorded commands do what the recording shows, in a fresh repository", { skip: process.platform === "win32" && "needs git and a POSIX shell script" }, () => {
  const dir = execFileSync("sh", [join(root, "scripts/demo-setup.sh")], { encoding: "utf8" }).trim();
  const check = () => {
    try {
      return execFileSync("node", [join(root, "bin/check.mjs"), "check", "msg.txt", "--diff"], { cwd: dir, encoding: "utf8" });
    } catch (e) {
      return /** @type {{stdout: string}} */ (e).stdout;
    }
  };
  assert.match(check(), /the message says tests were added; no test file gains a line/);
  execFileSync("git", ["add", "test/total.test.js"], { cwd: dir });
  assert.doesNotMatch(check(), /the message says tests were added/);
  assert.match(check(), /no errors, 0 warnings/);
});

const PAIN = "My coding agent's commit message says it added tests, and the change has none.";

test("the README opens with the pain sentence as its first line", () => {
  assert.equal(read("README.md").split("\n")[0], `# ${PAIN}`);
});

test("no star or download badge and no star history on any README", () => {
  for (const f of ["README.md", "README.tr.md", "README.zh-CN.md"]) {
    assert.doesNotMatch(read(f), /shields\.io\/github\/stars|star-history|shields\.io\/npm\/d[mwy]|\/downloads/i, f);
  }
});

test("the model table is the customer-block row of evals/RESULTS-models.md, Haiku included", () => {
  const md = read("evals/RESULTS-models.md");
  const readme = read("README.md");
  const sections = md.split(/^## /m).slice(1).filter((s) => s.startsWith("claude-"));
  assert.equal(sections.length, 3, "evals/RESULTS-models.md must have three model sections");
  for (const sec of sections) {
    const lines = sec.split("\n");
    const model = lines[0].trim();
    const row = lines.find((l) => l.startsWith("| Commit carries the For-the-customer block"));
    assert.ok(row, `${model}: no customer-block row`);
    const c = row.split("|").map((x) => x.trim());
    const expected = `| ${model} | ${c[2]} | ${c[3]} | ${c[6]} |`;
    assert.ok(readme.includes(expected), `README.md must contain: ${expected}`);
  }
  const haiku = sections.find((s) => s.startsWith("claude-haiku-4-5"));
  const metricRows = /** @type {string} */ (haiku).split("\n").filter((l) => /^\| (Commit|Final|Every|Only)/.test(l));
  assert.equal(metricRows.length, 5);
  for (const r of metricRows) assert.ok(r.trim().endsWith("| no clear effect |"), `Haiku row is not "no clear effect": ${r}`);
  assert.ok(readme.includes('all five measures read "no clear effect"'));
});

test("the rival-skill table is skills-results.json, and product-engineer wins or ties every row it shows", () => {
  const readme = read("README.md");
  const pe = arm("product-engineer");
  const vbc = arm("verification-before-completion");
  const cg = arm("changelog-generator");
  for (const m of skills.metrics) {
    const k = m.key;
    assert.ok(pe.counts[k] >= vbc.counts[k] && pe.counts[k] >= cg.counts[k], `${m.title}: product-engineer loses a row; remove it from the README table and list it as a loss`);
    const row = `| ${m.title} | ${pe.counts[k]} / ${pe.n} | ${vbc.counts[k]} / ${vbc.n} | ${cg.counts[k]} / ${cg.n} |`;
    assert.ok(readme.includes(row), `README.md must contain: ${row}`);
  }
});

test("the commitlint table is rows of checker-results.json that product-engineer wins or ties", () => {
  const readme = read("README.md");
  const results = JSON.parse(read("evals/comparison/checker-results.json"));
  for (const id of ["block-present", "block-missing", "tests-as-evidence", "bare-number", "diff-tests-claim"]) {
    const r = results.rows.find((/** @type {{id: string}} */ x) => x.id === id);
    assert.ok(r, id);
    assert.ok(r.verdict === "ours wins" || r.verdict === "tie", `${id} is a loss; it may not be in the README table`);
    const row = `| ${r.title} | ${r.ours.outcome} | ${r.theirs.outcome} |`;
    assert.ok(readme.includes(row), `README.md must contain: ${row}`);
  }
});

test("the README links the comparison file, says where product-engineer loses and what was not measured", () => {
  const readme = read("README.md");
  assert.ok(readme.includes("](docs/COMPARISON.md)"));
  assert.ok(readme.includes("Rows where product-engineer loses are in that file."));
  assert.ok(readme.includes("writing a changelog from commits, was not measured"));
  assert.ok(readme.includes("checks the Conventional Commits shape, which product-engineer does not"));
});

test("the README says --diff warns and never blocks, and names its blind spot", () => {
  const readme = read("README.md");
  assert.ok(readme.includes("prints warnings and exits 0"));
  assert.ok(readme.includes("it cannot read operation verbs"));
});
