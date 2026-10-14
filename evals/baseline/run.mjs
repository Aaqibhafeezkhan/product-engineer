// Measure what `check --diff` catches and what it misses, on the history of the repository
// it is run in. Writes evals/baseline/RESULTS.md. No model, no network, no cost.
//
//   node evals/baseline/run.mjs [--commits 200] [--repo .] [--out <file>]
//
// Every number in the output names the run that produced it, because rule five applies to
// this tool as much as to the messages it reads.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { crossCheck } from "../../bin/diff.mjs";
import { MUTATIONS } from "./mutate.mjs";
import { tableCell } from "./markdown.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const repo = flag("--repo", join(here, "..", ".."));
const limit = Number(flag("--commits", "200"));
const out = flag("--out", join(here, "RESULTS.md"));

const git = (args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: repo, encoding: "utf8", maxBuffer: 1 << 28 });

const SEP = "";
const FIELD = "";

/** The last `limit` non-merge commits as { sha, subject, body, files }. */
function readCommits() {
  const raw = git(["log", "--no-merges", `-n${limit}`, `--format=${SEP}%H${FIELD}%B${FIELD}`, "--numstat"]);
  const commits = [];
  for (const chunk of raw.split(SEP)) {
    if (!chunk.trim()) continue;
    const [sha, message, rest = ""] = chunk.split(FIELD);
    const files = [];
    for (const line of rest.split("\n")) {
      const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line.trim());
      if (!m) continue;
      const [, add, del, path] = m;
      // A rename prints "old => new" or "dir/{old => new}/file"; take the new path.
      const resolved = path.includes("=>") ? path.replace(/\{([^}]*) => ([^}]*)\}/, "$2").replace(/^.* => /, "") : path;
      files.push({ path: resolved, added: add === "-" ? 0 : Number(add), removed: del === "-" ? 0 : Number(del), binary: add === "-" });
    }
    if (files.length) commits.push({ sha: sha.trim(), message: message.trim(), files });
  }
  return commits;
}

/** True when the checker reports a mismatch. Info and ok lines are not detections. */
const warnings = (findings) => findings.filter((f) => f.level === "warn");
const onlyBrokenPath = (warns) => warns.length > 0 && warns.every((w) => /names? (a path|paths) that/.test(w.message));

const commits = readCommits();
if (!commits.length) {
  console.error("no commits with file changes found; is this a git repository?");
  process.exit(2);
}

// Negative samples: the real message against its real diff. Any warning here is a false
// alarm on something a person actually wrote.
let trueNegative = 0;
const falseAlarms = [];
const harnessArtefacts = [];
for (const c of commits) {
  const w = warnings(crossCheck(c.message, { files: c.files, range: c.sha }, { cwd: repo }));
  if (!w.length) {
    trueNegative++;
  } else if (onlyBrokenPath(w)) {
    // check 4 asks the working tree at HEAD, not the tree at that commit, so a path that
    // existed then and was deleted since looks broken. That is the harness, not the checker.
    harnessArtefacts.push({ sha: c.sha, message: w[0].message });
  } else {
    falseAlarms.push({ sha: c.sha, message: w[0].message });
  }
}
const negativesScored = trueNegative + falseAlarms.length;
const specificity = negativesScored ? (trueNegative / negativesScored) * 100 : 0;

// Positive samples: one mutation per type per eligible commit.
//
// A mutation counts as caught only when it produces a warning the unmutated message did not.
// Without that difference the score is wrong in a way that flatters the checker: the first
// run scored `operation` at 25% because one mutated message tripped the path check on a file
// that had been moved since the commit, which has nothing to do with the swapped verb.
const perType = [];
for (const { type, theirs, reachable, fn } of MUTATIONS) {
  let candidates = 0;
  let caught = 0;
  for (const c of commits) {
    const diff = { files: c.files, range: c.sha };
    const mutated = fn(c.message, diff);
    if (mutated === null) continue;
    candidates++;
    const before = new Set(warnings(crossCheck(c.message, diff, { cwd: repo })).map((w) => w.message));
    if (warnings(crossCheck(mutated, diff, { cwd: repo })).some((w) => !before.has(w.message))) caught++;
  }
  perType.push({ type, theirs, reachable, candidates, caught, recall: candidates ? (caught / candidates) * 100 : null });
}

const pct = (n) => (n === null ? "n/a" : `${n.toFixed(1)}%`);
const head = git(["rev-parse", "--short", "HEAD"]).trim();
const name = git(["rev-parse", "--show-toplevel"]).trim().split("/").pop();
const version = JSON.parse(execFileSync("node", ["-p", "JSON.stringify(require('./package.json'))"], { cwd: join(here, "..", ".."), encoding: "utf8" })).version;

const lines = [
  "# What `check --diff` catches, and what it does not",
  "",
  "Generated by `node evals/baseline/run.mjs`. Do not edit by hand. The corpus is the last N",
  "commits of a moving history, so the commit that updates this file changes its own numbers",
  "and a byte-for-byte freshness check could never pass. CI runs `--check` instead, which",
  "fails when there is a false alarm on a real message, when a kind marked reachable is not",
  "caught every time, or when the kind marked unreachable is caught at all.",
  "",
  `Run on \`${name}\` at \`${head}\`, ${commits.length} non-merge commits with file changes, product-engineer ${version}.`,
  "",
  "## Specificity: false alarms on real messages",
  "",
  "Every commit below is a real message about its own real change. A warning here is the",
  "checker being wrong about something a person wrote, which is the failure that matters.",
  "",
  "| measure | value |",
  "|---|---:|",
  `| commits scored | ${negativesScored} |`,
  `| no warning (correct) | ${trueNegative} |`,
  `| warned (false alarm) | ${falseAlarms.length} |`,
  `| **specificity** | **${pct(specificity)}** |`,
  "",
];

if (harnessArtefacts.length) {
  lines.push(
    `${harnessArtefacts.length} further commit${harnessArtefacts.length === 1 ? " was" : "s were"} excluded from that count, not scored as either.`,
    "Check 4 asks whether a path named in the message exists in the working tree, and the",
    "working tree is at HEAD rather than at the historical commit, so a file that existed then",
    "and was deleted since reads as a broken reference. That is an artifact of running the",
    "checker over history, not a fault in it, and folding it into the specificity number would",
    "understate the checker for a reason that has nothing to do with the checker.",
    "",
  );
}

if (falseAlarms.length) {
  lines.push("Every false alarm, in full:", "", "| commit | warning |", "|---|---|");
  for (const f of falseAlarms) lines.push(`| \`${f.sha.slice(0, 8)}\` | ${tableCell(f.message)} |`);
  lines.push("");
}

lines.push(
  "## Recall, per kind of inconsistency",
  "",
  "Each row mutates the same real commits so the message contradicts its own diff, then asks",
  "whether the checker notices. `candidates` is how many commits could carry that mutation.",
  "",
  "| type | CodeFuse-CommitEval type | reachable by design | candidates | caught | recall |",
  "|---|---|---|---:|---:|---:|",
);
for (const r of perType) {
  lines.push(`| \`${r.type}\` | ${r.theirs ?? "*ours, not theirs*"} | ${r.reachable ? "yes" : "**no**"} | ${r.candidates} | ${r.caught} | ${pct(r.recall)} |`);
}

lines.push(
  "",
  "No blended recall is reported. `operation` is in the corpus knowing no check reads",
  "operation verbs, so its row is a zero by design: a blind spot that shows in the results is",
  "one a reader can see, and one left out of the corpus is one this file would be hiding.",
  "",
  "Three kinds in that benchmark's taxonomy cannot be produced mechanically at all and are",
  "absent here: Function Name Mismatch, Component Mismatch and Purpose Mismatch each need",
  "someone to read what the code means. Missing Feature Description needs to know what the",
  "message should have said. This checker reads a numstat, which is paths and line counts.",
  "",
  "## The published numbers this sits beside, and why they are not a comparison",
  "",
  "Zhang, Liu, Di and Qian, *CodeFuse-CommitEval*, [arXiv:2511.19875](https://arxiv.org/abs/2511.19875),",
  "November 2025, report six open-source models averaging 85.95% recall, 80.28% precision and",
  "**63.8% specificity** on their own benchmark.",
  "",
  "That is a different corpus, a different method and a different question, and the two tables",
  "must not be read as a head-to-head. Their dataset is not obtainable: the file",
  "`data_synthesis/synthesized_data/eval_50k.jsonl` in their Apache-2.0 repository is a Git LFS",
  "pointer to a 280,641,409-byte object, and on 2026-09-05 the LFS batch API answered",
  "`Object does not exist on the server`, the media URL returned 404, and the repository has no",
  "releases and no issues. Their mutations are also model-generated, so regenerating their",
  "corpus would cost model calls and still would not reproduce their samples.",
  "",
  "What the comparison is good for is the shape. A model asked whether a message matches a",
  "diff answers on every commit and is wrong about roughly a third of the correct ones. This",
  "checker answers on the few kinds it can prove and should be wrong about almost none. Those",
  "are different tools for different moments, and the only claim made here is the second half.",
  "",
);

// --check asserts the claim rather than the bytes. The corpus is the last N commits of a
// moving history, so the commit that writes this file changes the numbers and a byte-for-byte
// freshness check can never pass. What must hold on every push is the claim the README makes:
// no false alarm on a real message, every reachable kind caught, and the unreachable one not.
if (argv.includes("--check")) {
  const problems = [];
  if (falseAlarms.length) problems.push(`${falseAlarms.length} false alarm${falseAlarms.length === 1 ? "" : "s"} on real messages: ${falseAlarms.map((f) => f.sha.slice(0, 8)).join(", ")}`);
  for (const r of perType) {
    if (r.candidates === 0) continue;
    if (r.reachable && r.recall !== 100) problems.push(`${r.type} is reachable by design but recall is ${pct(r.recall)} (${r.caught}/${r.candidates})`);
    if (!r.reachable && r.caught !== 0) problems.push(`${r.type} is not reachable by design but ${r.caught} of ${r.candidates} were caught`);
  }
  if (problems.length) {
    console.error("baseline check failed:");
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`baseline check ok: specificity ${pct(specificity)} over ${negativesScored} real commits, every reachable kind caught`);
  process.exit(0);
}

writeFileSync(out, lines.join("\n"));
console.log(`wrote ${out}`);
console.log(`specificity ${pct(specificity)} over ${negativesScored} real commits; ${falseAlarms.length} false alarm${falseAlarms.length === 1 ? "" : "s"}${harnessArtefacts.length ? `, ${harnessArtefacts.length} excluded as harness artefacts` : ""}`);
for (const r of perType) console.log(`  ${r.type.padEnd(16)} ${String(r.caught).padStart(4)}/${String(r.candidates).padEnd(4)} ${pct(r.recall)}`);
