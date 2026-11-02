#!/usr/bin/env node
// Runs the diff cross-check over the last N non-merge commits of each repository given, each commit's own message
// against its own change, and prints the findings per code plus every report (sha, subject, finding).
// The working tree stays at the repository's head, as in docs/check-reference.md#false-alarms-on-public-commits.
//
//   node scripts/false-alarm-corpus.mjs [--n 600] [--json out.json] <clone-dir> [<clone-dir> ...]
//
// Every report is a candidate false alarm to be read by a person; the script does not decide which are real.
// Node built-ins only.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { readDiff, crossCheck } from "../bin/diff.mjs";

const args = process.argv.slice(2);
const take = (flag, fallback) => {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const [, value] = args.splice(i, 2);
  return value;
};
const n = Number(take("--n", "600"));
const jsonOut = take("--json", null);
const dirs = args.map((d) => resolve(d));
if (!dirs.length) {
  console.error("usage: node scripts/false-alarm-corpus.mjs [--n 600] [--json out.json] <clone-dir> ...");
  process.exit(2);
}

const git = (cwd, a) => execFileSync("git", a, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const out = { n, repos: [] };
for (const dir of dirs) {
  const shas = git(dir, ["log", "--no-merges", "-n", String(n), "--format=%H"]).split("\n").filter(Boolean);
  const repo = { name: basename(dir), commits: shas.length, readable: 0, unreadable: 0, byCode: {}, reports: [] };
  for (const sha of shas) {
    let diff;
    try {
      git(dir, ["rev-parse", "--verify", "--quiet", `${sha}^`]);
      diff = readDiff({ range: `${sha}^..${sha}`, cwd: dir });
    } catch {
      repo.unreadable++;
      continue;
    }
    repo.readable++;
    const message = git(dir, ["log", "-1", "--format=%B", sha]);
    for (const f of crossCheck(message, diff, { cwd: dir })) {
      if (f.level !== "warn" && f.level !== "error") continue;
      repo.byCode[f.code] = (repo.byCode[f.code] ?? 0) + 1;
      repo.reports.push({ sha: sha.slice(0, 10), subject: message.split("\n")[0], code: f.code, message: f.message });
    }
  }
  out.repos.push(repo);
  const total = Object.values(repo.byCode).reduce((a, b) => a + b, 0);
  console.log(`${repo.name}: ${repo.commits} commits, ${repo.readable} readable, ${total} reports ${JSON.stringify(repo.byCode)}`);
}
const all = out.repos.flatMap((r) => r.reports);
console.log(`total: ${out.repos.reduce((a, r) => a + r.readable, 0)} readable commits, ${all.length} reports`);
for (const r of out.repos) for (const x of r.reports) console.log(`${r.name} ${x.sha} [${x.code}] ${x.subject.slice(0, 90)}\n    ${x.message.slice(0, 220).replace(/\n/g, " ")}`);
if (jsonOut) writeFileSync(jsonOut, `${JSON.stringify(out, null, 2)}\n`);
