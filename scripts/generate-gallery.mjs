#!/usr/bin/env node
// Generates site/gallery.html: every before/after pair the committed eval runs under
// evals/results* can show, in the same page at the same size, wins and non-wins alike.
//   node scripts/generate-gallery.mjs                write site/gallery.html
//   node scripts/generate-gallery.mjs --out <path>   write there instead (the drift test uses this)
// The measures are imported from evals/score.mjs, so the page can never drift from the
// tables in evals/RESULTS.md. Node built-ins only.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { metrics, score } from "../evals/score.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/Bubblegunn/product-engineer";

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

// Transcripts are quoted exactly as committed, but the pull request template bans em
// dashes in changed files, so every character outside ASCII goes out as a numeric
// character reference: the rendered page is identical, the file stays free of them.
const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[^\x00-\x7F]/g, (ch) => `&#${ch.codePointAt(0)};`);

const dirsOf = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

/** Run directories of one arm, numbered as score.mjs numbers them; null name means the arm directory itself. */
function runsOf(condDir) {
  const runs = readdirSync(condDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^run-\d+$/.test(d.name))
    .map((d) => ({ run: Number(d.name.slice(4)), name: d.name, dir: join(condDir, d.name) }))
    .sort((a, b) => a.run - b.run);
  return runs.length ? runs : [{ run: 1, name: "", dir: condDir }];
}

/** Task directories under a results root, at either layout depth, each with its suite name. */
function taskDirsUnder(rootDir) {
  const found = [];
  for (const name of dirsOf(rootDir)) {
    const level1 = join(rootDir, name);
    const names = dirsOf(level1);
    if (names.includes("bare") || names.includes("skill")) {
      found.push({ taskDir: level1, suite: "" });
      continue;
    }
    if (!names.length) {
      throw new Error(`${level1} under a results root is neither a task directory (holding bare/ and skill/) nor a suite of them; the gallery refuses to skip committed runs it does not recognise`);
    }
    for (const inner of names) {
      const level2 = join(level1, inner);
      if (dirsOf(level2).some((d) => d === "bare" || d === "skill")) {
        found.push({ taskDir: level2, suite: name });
      } else {
        throw new Error(`${level2} under a results root is neither a task directory (holding bare/ and skill/) nor a suite of them; the gallery refuses to skip committed runs it does not recognise`);
      }
    }
  }
  return found;
}

const rowsCache = new Map();
const rowsFor = (scopeDir) => {
  if (!rowsCache.has(scopeDir)) rowsCache.set(scopeDir, score(scopeDir));
  return rowsCache.get(scopeDir);
};

const countOf = (row) => Object.keys(metrics).reduce((sum, k) => sum + (row.results[k] ? 1 : 0), 0);

const repoLink = (...parts) => `${REPO}/blob/main/${parts.filter(Boolean).join("/")}`;

/** One pair per run number the two arms share, each naming its task and linking its transcripts. */
function pairsOfTask(rootName, suite, taskDir) {
  const task = basename(taskDir);
  const bareDir = join(taskDir, "bare");
  const skillDir = join(taskDir, "skill");
  if (!existsSync(bareDir) || !existsSync(skillDir)) {
    throw new Error(`${taskDir} holds one arm and not the other; the gallery pairs the arms and refuses to show a run without its sibling`);
  }
  const bareRuns = runsOf(bareDir);
  const skillRuns = runsOf(skillDir);
  if (bareRuns.length !== skillRuns.length) {
    throw new Error(`${taskDir} pairs ${bareRuns.length} bare runs against ${skillRuns.length} skill runs; run.sh writes the arms in matched sets`);
  }
  const rows = rowsFor(dirname(taskDir));
  const pairs = [];
  for (let i = 0; i < bareRuns.length; i++) {
    const bare = bareRuns[i];
    const skill = skillRuns[i];
    if (bare.run !== skill.run) {
      throw new Error(`${taskDir}: bare run ${bare.run} has no skill run ${bare.run} beside it`);
    }
    const bareRow = rows.find((r) => r.task === task && r.condition === "bare" && r.run === bare.run);
    const skillRow = rows.find((r) => r.task === task && r.condition === "skill" && r.run === skill.run);
    const bareCount = countOf(bareRow);
    const skillCount = countOf(skillRow);
    pairs.push({
      root: rootName,
      suite,
      task,
      run: bare.run,
      inRunDirs: skill.name !== "",
      skillLabel: skillRow.meta?.skill ?? "product-engineer",
      outcome: skillCount > bareCount ? "worked" : skillCount < bareCount ? "worse" : "no change",
      bareCount,
      skillCount,
      measures: Object.keys(metrics).length,
      bareCommit: read(join(bare.dir, "commit.txt")),
      skillCommit: read(join(skill.dir, "commit.txt")),
      bareTranscript: repoLink("evals", rootName, suite, task, "bare", bare.name, "transcript.json"),
      skillTranscript: repoLink("evals", rootName, suite, task, "skill", skill.name, "transcript.json"),
    });
  }
  return pairs;
}

/** Every pair in every committed transcript set, in a deterministic order. */
export function galleryPairs(evalsDir) {
  const pairs = [];
  for (const rootName of dirsOf(evalsDir).filter((n) => /^results/.test(n))) {
    for (const { taskDir, suite } of taskDirsUnder(join(evalsDir, rootName))) {
      pairs.push(...pairsOfTask(rootName, suite, taskDir));
    }
  }
  return pairs;
}

const outcomeSentence = (p) => {
  if (p.outcome === "no change") {
    return `Both arms passed ${p.bareCount} of the ${p.measures} measures: the skill changed nothing here.`;
  }
  const tail = p.outcome === "worse" ? "; the skill arm passed fewer" : "";
  return `The skill arm passed ${p.skillCount} of the ${p.measures} measures, the bare arm ${p.bareCount}${tail}.`;
};

const plural = (n) => (n === 1 ? "pair" : "pairs");

/** The static page: two sections, one per outcome side, every pair rendered the same size. */
export function renderPage(pairs) {
  const worked = pairs.filter((p) => p.outcome === "worked");
  const worse = pairs.filter((p) => p.outcome === "worse");
  const nothing = pairs.filter((p) => p.outcome === "no change");
  const n = Object.keys(metrics).length;
  const commitBlock = (text) =>
    text.trim()
      ? `<pre><code>${esc(text.trimEnd())}</code></pre>`
      : `<p class="note">The run committed nothing.</p>`;
  const pairHtml = (p) => {
    const where = ["evals/" + p.root, p.suite].filter(Boolean).join("/");
    const runLabel = p.inRunDirs ? `, run ${p.run}` : "";
    return [
      `  <article class="pair">`,
      `    <h3><code>${esc(p.task)}</code> <span class="where">${esc(where)}${runLabel}</span></h3>`,
      `    <p class="note">The skill arm ran the ${esc(p.skillLabel)} skill. ${esc(outcomeSentence(p))} <a href="${p.bareTranscript}">bare transcript</a>, <a href="${p.skillTranscript}">skill transcript</a>.</p>`,
      `    <span class="label">before, run without the skill</span>`,
      commitBlock(p.bareCommit),
      `    <span class="label">after, run with the skill</span>`,
      commitBlock(p.skillCommit),
      `  </article>`,
    ].join("\n");
  };
  const section = (title, list) => [
    `  <h2>${title} (${list.length} ${plural(list.length)})</h2>`,
    ...list.map(pairHtml),
    "",
  ];
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>product-engineer: the eval gallery</title>`,
    `<meta name="description" content="Every before and after pair the committed eval runs can show, generated from the transcripts under evals/, wins and non-wins alike.">`,
    `<!-- Generated by scripts/generate-gallery.mjs from evals/results*. Edit the generator, not this file; a test fails when the page and the transcripts disagree. -->`,
    `<style>`,
    `  :root { --ink: #111; --muted: #555; --rule: #e3e3e3; --blue: #1f3fbf; --paper: #fff; --code: #f6f6f6; }`,
    `  * { box-sizing: border-box; }`,
    `  html { color-scheme: light; }`,
    `  body { margin: 0; background: var(--paper); color: var(--ink); font: 17px/1.55 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }`,
    `  main { max-width: 760px; margin: 0 auto; padding: 56px 24px 96px; }`,
    `  header img { width: 360px; max-width: 100%; display: block; }`,
    `  .hook { font-size: 24px; line-height: 1.3; margin: 20px 0 8px; }`,
    `  .sub { color: var(--muted); margin: 0 0 32px; }`,
    `  h2 { font-size: 20px; margin: 48px 0 12px; padding-top: 16px; border-top: 1px solid var(--rule); }`,
    `  pre { background: var(--code); border: 1px solid var(--rule); padding: 14px 16px; overflow-x: auto; font: 14px/1.5 "SF Mono", Menlo, Consolas, monospace; margin: 12px 0; }`,
    `  code { font: 14px/1.5 "SF Mono", Menlo, Consolas, monospace; background: var(--code); padding: 1px 4px; }`,
    `  pre code { background: none; padding: 0; }`,
    `  .label { display: inline-block; font-size: 12px; letter-spacing: .02em; color: var(--muted); margin-bottom: 4px; }`,
    `  a { color: var(--blue); }`,
    `  .note { color: var(--muted); font-size: 15px; }`,
    `  .pair { margin: 28px 0 44px; }`,
    `  .pair h3 { font-size: 17px; margin: 0 0 6px; }`,
    `  .pair .where { color: var(--muted); font-weight: normal; font-size: 13px; }`,
    `  .pair .note { margin: 4px 0 12px; }`,
    `  @media (max-width: 520px) { .hook { font-size: 21px; } body { font-size: 16px; } }`,
    `</style>`,
    `</head>`,
    `<body>`,
    `<main>`,
    `  <header>`,
    `    <img src="assets/wordmark.svg" alt="product-engineer">`,
    `    <p class="hook">Before and after, from every committed eval run.</p>`,
    `    <p class="sub">Nothing on this page is written by hand: each before is the commit the bare arm made, each after is the commit the skill arm made for the same task, quoted exactly as committed. The measures are the yes/no checks of <a href="${REPO}/blob/main/evals/RESULTS.md">evals/RESULTS.md</a>, and each pair links the transcripts of both runs.</p>`,
    `  </header>`,
    ``,
    `  <h2>The gallery</h2>`,
    `  <p>Generated by <code>node scripts/generate-gallery.mjs</code> from the transcripts under <code>evals/results*</code>. A test regenerates this page and fails when it no longer matches the transcripts, so nothing here goes stale. The pairs in the second section are the ones where the skill arm passed fewer of the ${n} measures than the bare arm, or the same number; both sections render each pair at the same size.</p>`,
    ``,
    ...section(`Where the skill moved the measures`, worked),
    ...section(`Where the skill did nothing, or made the message worse`, [...worse, ...nothing]),
    ``,
    `  <p class="note">Regenerate with <code>node scripts/generate-gallery.mjs</code>. The drift test in <code>test/gallery.test.mjs</code> regenerates into a temp file and compares bytes with this page. Transcripts are committed under <code>evals/results*</code>; the pairs are only what they say.</p>`,
    `</main>`,
    `</body>`,
    `</html>`,
    ``,
  ].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const outIdx = process.argv.indexOf("--out");
  if (outIdx > -1 && !process.argv[outIdx + 1]) {
    console.error("usage: node scripts/generate-gallery.mjs [--out <path>]");
    process.exit(2);
  }
  const target = outIdx > -1 ? resolve(process.argv[outIdx + 1]) : join(root, "site", "gallery.html");
  writeFileSync(target, renderPage(galleryPairs(join(root, "evals"))));
  console.log(`wrote ${target}`);
}
