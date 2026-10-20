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
