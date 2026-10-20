#!/usr/bin/env node
// Runs product-engineer's checker and commitlint on the same messages (evals/comparison/cases.mjs)
// and writes evals/comparison/checker-results.json, which evals/comparison/render.mjs turns into
// docs/COMPARISON.md. No model is called, so a run costs nothing.
//
//   node scripts/comparison/fetch-upstream.mjs                       # once, needs network
//   node evals/comparison/checker.mjs --run --date 2026-10-21        # POSIX shell only
//
// Node built-ins only.
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyse } from "../../bin/check.mjs";
import { readDiff, crossCheck } from "../../bin/diff.mjs";
import { CASES } from "./cases.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
export const RESULTS = join(here, "checker-results.json");

/** A repository with one commit and `files` staged on top of it. */
function stagedRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), "pe-compare-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "--quiet", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "T");
  writeFileSync(join(dir, "README.md"), "# fixture\n");
  git("add", "-A");
  git("commit", "--quiet", "-m", "init");
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  git("add", "-A");
  return dir;
}

/** "flagged" when the checker reports an error or a warning, otherwise "passed". */
export function runOurs(c) {
  let findings = analyse(c.message, { cwd: root }).findings;
  if (c.change) {
    const dir = stagedRepo(c.change);
    try {
      findings = findings.concat(crossCheck(c.message, readDiff({ cwd: dir }), { cwd: dir }));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const hits = findings.filter((f) => f.level === "error" || f.level === "warn");
  return { outcome: hits.length ? "flagged" : "passed", detail: hits.map((f) => f.message).join("; ") };
}

/**
 * "flagged" when commitlint exits non-zero, "passed" on zero, "cannot" when the case needs the change
 * and commitlint only ever reads a message. `spawn` is injectable so a test needs no install.
 */
export function runCommitlint(c, { dir, spawn = spawnSync } = {}) {
  if (c.change) return { outcome: "cannot", detail: "commitlint reads the message only and is never given the change" };
  const r = spawn(join(dir, "node_modules", ".bin", "commitlint"), ["--config", join(dir, "commitlint.config.cjs")], { input: c.message, encoding: "utf8", cwd: dir });
  if (r.error || r.status === null) throw new Error(`commitlint did not run: ${r.error ? r.error.message : "no exit status"}`);
  const rules = [...new Set(`${r.stdout}${r.stderr}`.match(/\[[a-z-]+\]/g) ?? [])].map((s) => s.slice(1, -1));
  return { outcome: r.status === 0 ? "passed" : "flagged", detail: rules.join(", ") };
}

/**
 * Who got the case right. A tool is right when it flags a defect or passes a clean message.
 * "cannot" is never right: a tool that cannot see the input does not catch the defect in it.
 */
export function verdict(defect, ours, theirs) {
  const right = (o) => (defect ? o === "flagged" : o === "passed");
  const a = right(ours);
  const b = right(theirs);
  if (a && b) return "tie";
  if (a) return "ours wins";
  if (b) return "ours loses";
  return "neither";
}

export function runAll({ dir, date, ourVersion, tool, spawn }) {
  const rows = CASES.map((c) => {
    const ours = runOurs(c);
    const theirs = runCommitlint(c, { dir, spawn });
    return { id: c.id, area: c.area, title: c.title, defect: c.defect, ours, theirs, verdict: verdict(c.defect, ours.outcome, theirs.outcome) };
  });
  return { runDate: date, ourVersion, tool, rows };
}

function main(argv) {
  const get = (name) => argv[argv.indexOf(name) + 1];
  if (!argv.includes("--run")) {
    console.error("usage: node evals/comparison/checker.mjs --run --date YYYY-MM-DD");
    return 2;
  }
  const date = get("--date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    console.error("--date must be YYYY-MM-DD");
    return 2;
  }
  const pins = JSON.parse(readFileSync(join(root, "scripts", "comparison", "pins.json"), "utf8"));
  const pin = pins.checkers.find((c) => c.id === "commitlint");
  const dir = join(root, "_upstream", "commitlint");
  const installed = JSON.parse(readFileSync(join(dir, "node_modules", "@commitlint", "cli", "package.json"), "utf8")).version;
  if (installed !== pin.npm["@commitlint/cli"]) {
    console.error(`_upstream/commitlint has @commitlint/cli ${installed}, pins.json says ${pin.npm["@commitlint/cli"]}; run scripts/comparison/fetch-upstream.mjs`);
    return 1;
  }
  const ourVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const out = runAll({
    dir,
    date,
    ourVersion,
    tool: { id: pin.id, name: pin.name, licence: pin.licence, version: installed, config: pin.config, commit: pin.commit },
  });
  writeFileSync(RESULTS, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote ${RESULTS}: ${out.rows.length} cases`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
