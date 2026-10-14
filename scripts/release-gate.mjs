#!/usr/bin/env node
// The release gate, run in CI on every push: the version the package states must be the
// version the CHANGELOG, the citation file, the Action, the plugin manifest and every file in
// scripts/versioned-files.json state, and
// `npm pack` must ship nothing outside scripts/pack-allowlist.txt.
//
// `--update` rewrites the allowlist from the current pack (review the diff before committing).
// Same file in every Bubblegunn repository; what differs between them lives in
// scripts/versioned-files.json. Node built-ins only.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compareVersions } from "./version.mjs";
import { extractPackedFiles } from "./npm-pack.mjs";
import { versionedFiles, readVersion, LIST } from "./versioned-files.mjs";

const root = process.cwd();
const read = (f) => readFileSync(join(root, f), "utf8");
const has = (f) => existsSync(join(root, f));
const problems = [];

const pkg = JSON.parse(read("package.json"));
const version = pkg.version;

// Two states, not one. A released entry carries the package's own version and a date; an entry for
// a version that is not out yet carries no date. Requiring the first alone is what made it
// impossible to write a contributor's credit on the day their work merged, because `release.mjs`
// requires that entry to exist before it will cut the release. Ported from workproof#29, where the
// fix and its shared comparator came from @shivam-070208.
const heading = /^## +(\S+)(.*)$/m.exec(read("CHANGELOG.md"));
let changelogState;
if (!heading) {
  problems.push("CHANGELOG.md has no '## ' heading");
} else {
  const headingVersion = heading[1];
  const hasDate = /\d{4}-\d{2}-\d{2}/.test(heading[2]);
  if (!/^\d+\.\d+\.\d+$/.test(headingVersion)) {
    problems.push(`CHANGELOG.md top entry is not a version: ${headingVersion}`);
  } else {
    const comparison = compareVersions(headingVersion, version);
    if (comparison === 0) {
      if (hasDate) changelogState = `released at ${version}`;
      else problems.push(`CHANGELOG.md top entry ${headingVersion} is undated`);
    } else if (comparison > 0) {
      if (hasDate) problems.push(`CHANGELOG.md top entry ${headingVersion} is dated, package.json is ${version}`);
      else changelogState = `${headingVersion} pending, package at ${version}`;
    } else {
      problems.push(`CHANGELOG.md top entry is ${headingVersion}, package.json is ${version}`);
    }
  }
}

if (has("CITATION.cff")) {
  const v = /^version: "?([^"\n]+)"?$/m.exec(read("CITATION.cff"))?.[1];
  if (v !== version) problems.push(`CITATION.cff version is ${v}, package.json is ${version}`);
}
if (has("action.yml")) {
  const m = /^  version:\n(?:    (?!default:).*\n)*    default: "([^"]*)"/m.exec(read("action.yml"));
  if (m && m[1] !== version) problems.push(`action.yml version input default is ${m[1]}, package.json is ${version}`);
}
if (has("python/pyproject.toml")) {
  const v = /^version = "([^"]*)"$/m.exec(read("python/pyproject.toml"))?.[1];
  if (v !== version) problems.push(`python/pyproject.toml version is ${v}, package.json is ${version}`);
}
if (has(".claude-plugin/plugin.json")) {
  const v = JSON.parse(read(".claude-plugin/plugin.json")).version;
  if (v !== version) problems.push(`.claude-plugin/plugin.json version is ${v}, package.json is ${version}`);
}

// The repository's own list (scripts/versioned-files.json), the same one release.mjs sets.
try {
  for (const entry of versionedFiles(root)) {
    if (!has(entry.path)) {
      problems.push(`${entry.path} is listed in ${LIST} but does not exist`);
      continue;
    }
    const v = readVersion(read(entry.path), entry);
    if (v === null) problems.push(`${entry.path}: the pattern in ${LIST} matched nothing`);
    else if (v !== version) problems.push(`${entry.path} version is ${v}, package.json is ${version}`);
  }
} catch (err) {
  problems.push(err instanceof Error ? err.message : String(err));
}

const packed = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], shell: process.platform === "win32" }),
);
const files = extractPackedFiles(packed, pkg.name).map((f) => f.path).sort();
const allowlistPath = "scripts/pack-allowlist.txt";
if (process.argv.includes("--update")) {
  writeFileSync(join(root, allowlistPath), `${files.join("\n")}\n`);
  console.log(`release-gate: wrote ${files.length} paths to ${allowlistPath}`);
  process.exit(0);
}
if (!has(allowlistPath)) problems.push(`${allowlistPath} is missing; run node scripts/release-gate.mjs --update`);
else {
  const allowed = read(allowlistPath)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const ok = (p) => allowed.some((a) => (a.endsWith("/") ? p.startsWith(a) : a === p));
  for (const f of files) if (!ok(f)) problems.push(`npm pack would ship ${f}, which is not in ${allowlistPath}`);
}

if (problems.length) {
  for (const p of problems) console.error(`release-gate: ${p}`);
  process.exit(1);
}
console.log(`release-gate: ok, ${changelogState}, ${files.length} packed files all allowed`);
