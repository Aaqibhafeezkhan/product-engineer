#!/usr/bin/env node
// Fetches every competitor named in scripts/comparison/pins.json into _upstream/ (gitignored),
// at the pinned commit or npm version. Nothing here is ever copied into the tracked tree.
//
//   node scripts/comparison/fetch-upstream.mjs --dry-run   # print the commands, run nothing
//   node scripts/comparison/fetch-upstream.mjs             # run them (needs network)
//
// Node built-ins only.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PINS = join(root, "scripts", "comparison", "pins.json");
export const UPSTREAM = join(root, "_upstream");

export function readPins(file = PINS) {
  return JSON.parse(readFileSync(file, "utf8"));
}

const ALLOWED_TO_COPY = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"]);

/** Throws when a pin would let unlicensed, GPL or MPL code be copied or is not pinned to a full commit. */
export function checkPins(pins) {
  for (const p of [...pins.checkers, ...pins.skills]) {
    if (typeof p.licence !== "string" || p.licence === "") throw new Error(`${p.id}: no licence recorded`);
    if (p.commit !== undefined && !/^[0-9a-f]{40}$/.test(p.commit)) throw new Error(`${p.id}: commit must be a full 40-character sha`);
  }
  for (const s of pins.skills) {
    if (s.copy === true && !ALLOWED_TO_COPY.has(s.licence)) throw new Error(`${s.id}: licence ${s.licence} may not be copied`);
  }
  return true;
}

/** The commands to run, as [command, args, cwd] triples. Pure, so a test can read it. */
export function plan(pins, upstream = UPSTREAM) {
  const steps = [];
  for (const c of pins.checkers) {
    const dir = join(upstream, c.id);
    const specs = Object.entries(c.npm).map(([name, version]) => `${name}@${version}`);
    steps.push(["npm", ["install", "--prefix", dir, "--no-audit", "--no-fund", "--ignore-scripts", ...specs], root]);
  }
  const repos = new Map();
  for (const s of pins.skills) repos.set(s.repo, s.commit);
  for (const [repo, commit] of repos) {
    const dir = join(upstream, repo.split("/")[1]);
    steps.push(["git", ["init", "-q", dir], root]);
    steps.push(["git", ["fetch", "-q", "--depth", "1", "--filter=blob:none", `https://github.com/${repo}.git`, commit], dir]);
    // This checkout is inside the gitignored _upstream clone, not our working tree.
    steps.push(["git", ["checkout", "-q", "FETCH_HEAD"], dir]);
  }
  return steps;
}

function main(argv) {
  const pins = readPins();
  checkPins(pins);
  const steps = plan(pins);
  if (argv.includes("--dry-run")) {
    for (const [cmd, args, cwd] of steps) console.log(`(cd ${cwd} && ${cmd} ${args.join(" ")})`);
    return 0;
  }
  mkdirSync(UPSTREAM, { recursive: true });
  for (const [cmd, args, cwd] of steps) {
    mkdirSync(cwd, { recursive: true });
    execFileSync(cmd, args, { cwd, stdio: "inherit" });
  }
  // commitlint reads this file; it extends the pinned shareable config and nothing else.
  for (const c of pins.checkers) {
    const cfg = join(UPSTREAM, c.id, "commitlint.config.cjs");
    if (!existsSync(cfg)) writeFileSync(cfg, `module.exports = { extends: ["${c.config}"] };\n`);
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
