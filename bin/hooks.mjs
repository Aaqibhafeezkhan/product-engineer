import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

export const GENERATED_MARKER = "# product-engineer generated hook";

const generatedCommitMsgHook = readFileSync(new URL("../scripts/commit-msg", import.meta.url), "utf8");
const commitMsgHook = generatedCommitMsgHook.replace(/^(#![^\n]*\n)/, `$1${GENERATED_MARKER}\n`);

const prepareMsgHook = [
  "#!/bin/sh",
  GENERATED_MARKER,
  "# Prefills the customer-facing block for a new commit message.",
  "set -eu",
  'file="$1"',
  'source="${2-}"',
  "case \"$source\" in message|merge|squash) exit 0 ;; esac",
  "if grep -qE '^(For the customer(:|：)|Müşteri için(:|：)|お客さまへ(:|：)|给客户(:|：))[[:space:]]*$' \"$file\"; then",
  "  exit 0",
  "fi",
  "cat >> \"$file\" <<'MSG'",
  "",
  "For the customer:",
  "What changed:",
  "Why it matters:",
  "MSG",
].join("\n") + "\n";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function hookDirectory(cwd) {
  let root;
  try {
    root = git(cwd, "rev-parse", "--show-toplevel");
  } catch {
    throw new Error("run this command inside a Git repository");
  }
  return resolve(root, git(root, "rev-parse", "--git-path", "hooks"));
}

function isGenerated(path) {
  return existsSync(path) && readFileSync(path, "utf8").split("\n").slice(0, 3).includes(GENERATED_MARKER);
}

export function installHooks({ cwd = process.cwd(), prefill = false, force = false } = {}) {
  const dir = hookDirectory(cwd);
  const targets = [{ path: join(dir, "commit-msg"), content: commitMsgHook }];
  if (prefill) targets.push({ path: join(dir, "prepare-commit-msg"), content: prepareMsgHook });

  const conflicts = targets.filter(({ path }) => existsSync(path) && !isGenerated(path) && !force);
  if (conflicts.length) {
    throw new Error(`refusing to overwrite existing hook: ${conflicts.map(({ path }) => path).join(", ")}. Re-run with --force to replace it.`);
  }

  mkdirSync(dir, { recursive: true });
  for (const { path, content } of targets) {
    writeFileSync(path, content, { mode: 0o755 });
    chmodSync(path, 0o755);
  }
  return targets.map(({ path }) => path);
}

export function uninstallHooks({ cwd = process.cwd() } = {}) {
  const dir = hookDirectory(cwd);
  const removed = [];
  for (const name of ["commit-msg", "prepare-commit-msg"]) {
    const path = join(dir, name);
    if (isGenerated(path)) {
      rmSync(path);
      removed.push(path);
    }
  }
  return removed;
}

export function runHookCommand(args, cwd = process.cwd()) {
  const [action, ...flags] = args;
  if (action === "install") {
    const unknown = flags.filter((flag) => !["--prefill", "--force"].includes(flag));
    if (unknown.length) throw new Error(`unknown hook install option: ${unknown.join(" ")}`);
    const installed = installHooks({ cwd, prefill: flags.includes("--prefill"), force: flags.includes("--force") });
    console.log(`installed ${installed.join(" and ")}`);
    return 0;
  }
  if (action === "uninstall" && flags.length === 0) {
    const removed = uninstallHooks({ cwd });
    console.log(removed.length ? `removed ${removed.join(" and ")}` : "no generated product-engineer hooks found");
    return 0;
  }
  throw new Error("usage: product-engineer hook install [--prefill] [--force] | hook uninstall");
}
