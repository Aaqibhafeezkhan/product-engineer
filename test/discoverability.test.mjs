// @ts-check
// SEO, ASO and GEO surfaces: one category sentence, structured data, sitemap, llms files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (/** @type {string} */ p) => readFileSync(join(root, p), "utf8");
const pkg = JSON.parse(read("package.json"));
const CS = pkg.description;
const HOME = "https://bubblegunn.github.io/product-engineer/";

test("the category sentence is the package description, pinned, and short enough for every store", () => {
  assert.equal(
    CS,
    "product-engineer is an agent skill and command-line checker that makes AI coding agents explain each commit and pull request in plain language, and warns when the message contradicts the diff.",
  );
  assert.ok(CS.length <= 350, "GitHub description limit is 350 characters");
});

test("every surface uses the category sentence word for word", () => {
  const surfaces = ["README.md", "llms.txt", "site/llms.txt"];
  for (const f of surfaces) assert.ok(read(f).includes(CS), `${f} does not contain the category sentence`);
  const html = read("site/index.html");
  assert.ok(html.includes(`<meta name="description" content="${CS}">`), "site meta description");
  const ld = JSON.parse(/** @type {RegExpMatchArray} */ (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/))[1]);
  assert.equal(ld["@type"], "SoftwareSourceCode");
  assert.equal(ld.description, CS);
  assert.equal(ld.codeRepository, "https://github.com/Bubblegunn/product-engineer");
  assert.equal(ld.url, HOME);
});

test("the site head names the topic and points at its canonical address", () => {
  const html = read("site/index.html");
  assert.ok(html.includes("<title>product-engineer: plain-language commits from AI agents</title>"));
  assert.ok(html.includes(`<link rel="canonical" href="${HOME}">`));
});

test("sitemap and robots exist and agree with the home address", () => {
  assert.ok(read("site/sitemap.xml").includes(`<loc>${HOME}</loc>`));
  assert.ok(read("site/robots.txt").includes(`Sitemap: ${HOME}sitemap.xml`));
});

test("package keywords include the search phrases from the research report", () => {
  const required = [
    "claude-code-skill",
    "agent-skills",
    "commit-message",
    "commit-message-lint",
    "pull-request-description",
    "ai-coding-agent",
    "plain-language",
    "non-technical-stakeholders",
    "commitlint",
    "github-action",
    "diff-check",
  ];
  for (const k of required) assert.ok(pkg.keywords.includes(k), `package.json keywords lack: ${k}`);
});

test("site/llms.txt and site/llms-full.txt are generated, not hand-edited", () => {
  const r = spawnSync("node", [join(root, "scripts/build-llms.mjs"), "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("llms-full.txt contains the README and every docs page that exists", () => {
  const full = read("site/llms-full.txt");
  assert.ok(full.includes("# FILE: README.md"));
  for (const f of readdirSync(join(root, "docs")).filter((x) => /^(FAQ|vs-.*|COMPARISON)\.md$/.test(x))) {
    assert.ok(full.includes(`# FILE: docs/${f}`), `llms-full.txt lacks docs/${f}`);
  }
});

test("llms.txt: relative links resolve in the repository", () => {
  for (const m of read("llms.txt").matchAll(/\]\((?!https?:|#)([^)#\s]+)\)/g)) {
    assert.ok(existsSync(join(root, m[1])), `llms.txt links to a missing path: ${m[1]}`);
  }
});

const skills = JSON.parse(read("evals/comparison/skills-results.json"));
const checker = JSON.parse(read("evals/comparison/checker-results.json"));
const arm = (/** @type {string} */ id) => skills.arms.find((/** @type {{id: string}} */ a) => a.id === id);

/** GitHub heading slug: lowercase, drop punctuation except hyphens, spaces to hyphens. */
const slug = (/** @type {string} */ h) =>
  h.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");

function headings(/** @type {string} */ file) {
  return read(file).split("\n").filter((l) => /^#{1,6} /.test(l)).map((l) => slug(l.replace(/^#+\s+/, "")));
}

function checkLinks(/** @type {string} */ file) {
  const dir = dirname(file);
  for (const m of read(file).matchAll(/\]\((?!https?:|mailto:)([^)\s]*)\)/g)) {
    const [target, anchor] = m[1].split("#");
    const path = target === "" ? file : join(dir, target);
    assert.ok(existsSync(join(root, path)), `${file}: link to a missing path: ${m[1]}`);
    if (anchor && path.endsWith(".md")) assert.ok(headings(path).includes(anchor), `${file}: no heading for #${anchor} in ${path}`);
  }
}

const PAGES = [
  "README.md",
  "docs/FAQ.md",
  "docs/vs-commitlint.md",
  "docs/vs-verification-before-completion.md",
  "docs/vs-changelog-generator.md",
  "docs/check-reference.md",
];

test("every relative link and heading anchor in the pages written for Phase 2 resolves", () => {
  for (const f of PAGES) checkLinks(f);
});

test("the new docs contain no em dash", () => {
  for (const f of PAGES) assert.ok(!read(f).includes("—"), `${f} contains an em dash`);
});

test("the FAQ is questions and answers, opens with the category sentence and links every comparison page", () => {
  const faq = read("docs/FAQ.md");
  assert.ok(faq.includes(CS));
  const questions = faq.split("\n").filter((l) => /^## .*\?$/.test(l));
  assert.ok(questions.length >= 10, `only ${questions.length} questions`);
  for (const p of ["vs-commitlint.md", "vs-verification-before-completion.md", "vs-changelog-generator.md"]) {
    assert.ok(faq.includes(`](${p})`), `FAQ does not link ${p}`);
  }
});

test("the FAQ model answer repeats the per-model customer-block counts from evals/RESULTS-models.md", () => {
  const md = read("evals/RESULTS-models.md");
  const faq = read("docs/FAQ.md");
  for (const sec of md.split(/^## /m).slice(1).filter((s) => s.startsWith("claude-"))) {
    const model = sec.split("\n")[0].trim();
    const row = /** @type {string} */ (sec.split("\n").find((l) => l.startsWith("| Commit carries the For-the-customer block")));
    const c = row.split("|").map((x) => x.trim());
    assert.ok(faq.includes(`${model}: ${c[2]} without the skill, ${c[3]} with it`), `FAQ lacks the ${model} counts`);
  }
});

test("vs-commitlint.md lists all rows of checker-results.json and the win, tie and loss counts", () => {
  const page = read("docs/vs-commitlint.md");
  const cell = (/** @type {{outcome: string}} */ x) => x.outcome;
  for (const r of checker.rows) {
    const row = `| ${r.title} | ${cell(r.ours)} | ${cell(r.theirs)} |`;
    assert.ok(page.includes(row), `vs-commitlint.md must contain: ${row}`);
  }
  const n = (/** @type {string} */ v) => checker.rows.filter((/** @type {{verdict: string}} */ r) => r.verdict === v).length;
  assert.ok(page.includes(`product-engineer won ${n("ours wins")} cases, tied ${n("tie")} and lost ${n("ours loses")}.`));
  assert.ok(page.includes("## Where product-engineer loses"));
});

for (const [id, file] of [
  ["verification-before-completion", "docs/vs-verification-before-completion.md"],
  ["changelog-generator", "docs/vs-changelog-generator.md"],
]) {
  test(`${file} rebuilds its table from skills-results.json`, () => {
    const page = read(file);
    const pe = arm("product-engineer");
    const rival = arm(id);
    for (const m of skills.metrics) {
      const row = `| ${m.title} | ${pe.counts[m.key]} / ${pe.n} | ${rival.counts[m.key]} / ${rival.n} |`;
      assert.ok(page.includes(row), `${file} must contain: ${row}`);
    }
    assert.ok(page.includes("## Where product-engineer loses or ties"));
    assert.ok(page.includes("## What was not measured"));
  });
}

test("GEO-PROMPTS has exactly five numbered prompts, each a question, and a table to record answers", () => {
  const t = read("docs/GEO-PROMPTS.md");
  const prompts = t.split("\n").filter((l) => /^[1-5]\. /.test(l));
  assert.equal(prompts.length, 5);
  for (const p of prompts) assert.ok(p.trim().endsWith("?"), `prompt is not a question: ${p}`);
  assert.ok(/\| date \| model \| prompt \| names product-engineer \|/.test(t));
  assert.ok(!t.includes("—"));
});

test("LISTINGS has the category sentence, one section per store that applies, and a Marketplace description within 125 characters", () => {
  const t = read("docs/LISTINGS.md");
  assert.ok(t.includes(CS));
  for (const h of ["## npm", "## GitHub Marketplace (Action)", "## skills.sh", "## Claude Code plugin directory", "## Codex and Cursor plugin directories", "## Stores that do not apply"]) {
    assert.ok(t.includes(h), `LISTINGS.md lacks: ${h}`);
  }
  const m = t.match(/^Description \(125 characters or fewer\): (.+)$/m);
  assert.ok(m, "Marketplace description line missing");
  assert.ok(m[1].length <= 125, `Marketplace description is ${m[1].length} characters`);
  assert.ok(t.includes(`Keywords: ${pkg.keywords.join(", ")}`), "npm keywords in LISTINGS.md must equal package.json keywords");
  assert.ok(!t.includes("—"));
});
