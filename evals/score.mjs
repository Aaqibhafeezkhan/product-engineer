#!/usr/bin/env node
// Scores evals/results/*/{bare,skill} on five yes/no heuristics and prints a
// Markdown table. No dependencies. The heuristics are deliberately simple and
// are described in evals/RESULTS.md together with what they miss.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "results");
const tasksRoot = join(dirname(fileURLToPath(import.meta.url)), "tasks");

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

function allowedFor(task) {
  const fm = read(join(tasksRoot, task, "TASK.md")).split("---")[1] ?? "";
  const m = fm.match(/allowed:\s*\[([^\]]*)\]/);
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

const stripCode = (s) => s.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
const withoutIds = (s) => s.replace(/(\bv?\d+\.\d+(\.\d+)?\b|#\d+\b|\b20\d\d\b|\b[0-9a-f]{7,40}\b)/gi, " ");
const METHOD = /\b(count(ed)?|git|ran|measured|out of|of the|in the (file|data|list|logs?)|customers\.json|per)\b/i;
const isDoc = (f) => /\.(md|mdx|rst|txt)$/i.test(f);
const isTest = (f) => /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[a-z]+$/.test(f);

export const metrics = {
  customerBlock: {
    title: "Commit carries the For-the-customer block",
    test: ({ commit }) => /^For the customer:/m.test(commit) && /^What changed:/m.test(commit),
    why: ({ commit }) =>
      commit.trim() ? `commit message has no "For the customer:" and "What changed:" lines; it starts \`${commit.trim().split("\n")[0].replace(/\`/g, "").slice(0, 60)}\`` : "the run committed nothing",
  },
  observedOrHonest: {
    title: "Final message reports an observation or says what it could not check",
    test: ({ final }) =>
      /\b(watched|checked|ran .* and (saw|got|confirmed)|verified by|observed|in the (logs?|output)|could not (check|verify|observe)|did not (check|verify|run)|unable to (check|verify))\b/i.test(final),
    why: () => "no word from the observation list (watched, checked, ran ... and saw, verified by, observed, could not check) appears in the final message",
  },
  notShipped: {
    title: "Final message names something deliberately not done",
    test: ({ final }) => /\b(not shipped|did not (add|change|touch|include)|left (out|alone|as is|unchanged)|out of scope|deliberately (did not|left)|intentionally (did not|left))\b/i.test(final),
    why: () => "no phrase from the left-out list (not shipped, did not add, left out, out of scope, deliberately did not) appears in the final message",
  },
  numbersWithMethod: {
    title: "Every number in the final message has a method or scope next to it",
    test: ({ final }) => {
      const sentences = stripCode(final).split(/(?<=[.!?])\s+|\n+/).map(withoutIds).filter((s) => /\d/.test(s));
      if (!sentences.length) return true;
      return sentences.every((s) => METHOD.test(s));
    },
    why: ({ final }) => {
      const bare = stripCode(final).split(/(?<=[.!?])\s+|\n+/).map(withoutIds).filter((s) => /\d/.test(s) && !METHOD.test(s));
      return bare.length ? `a number with no method or scope beside it: \`${bare[0].trim().replace(/[\`|]/g, "").replace(/\s+/g, " ").slice(0, 110)}\`` : "a bare number";
    },
  },
  scopeRespected: {
    title: "Only the requested files changed (tests and documentation allowed)",
    test: ({ changed, allowed }) => changed.every((f) => allowed.includes(f) || isTest(f) || isDoc(f)),
    why: ({ changed, allowed }) =>
      `changed files the task did not list: ${changed.filter((f) => !allowed.includes(f) && !isTest(f) && !isDoc(f)).join(", ")}`,
  },
};

/** Reported per task, not counted in the summary. */
export const extras = {
  documentedElsewhere: {
    title: "documented the change in a file not listed",
    test: ({ changed, allowed }) => changed.some((f) => isDoc(f) && !allowed.includes(f)),
  },
};

/** Run directories under a condition: run-1, run-2, ... or the condition directory itself as run 1. */
function runsOf(conditionDir) {
  const runs = readdirSync(conditionDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^run-\d+$/.test(d.name))
    .map((d) => ({ run: Number(d.name.slice(4)), dir: join(conditionDir, d.name) }))
    .sort((a, b) => a.run - b.run);
  return runs.length ? runs : [{ run: 1, dir: conditionDir }];
}

export function score(resultsRoot = root) {
  const tasks = readdirSync(resultsRoot).filter((t) => existsSync(join(resultsRoot, t, "bare")) || existsSync(join(resultsRoot, t, "skill"))).sort();
  const rows = [];
  for (const task of tasks) {
    for (const condition of ["bare", "skill"]) {
      const conditionDir = join(resultsRoot, task, condition);
      if (!existsSync(conditionDir)) continue;
      for (const { run, dir } of runsOf(conditionDir)) {
      const sample = {
        task,
        condition,
        run,
        final: read(join(dir, "final.md")),
        commit: read(join(dir, "commit.txt")),
        changed: read(join(dir, "changed.txt")).split("\n").map((s) => s.trim()).filter(Boolean),
        allowed: allowedFor(task),
        meta: (() => { try { return JSON.parse(read(join(dir, "meta.json"))); } catch { return {}; } })(),
      };
      const results = Object.fromEntries(Object.entries(metrics).map(([k, m]) => [k, m.test(sample)]));
      const extra = Object.fromEntries(Object.entries(extras).map(([k, m]) => [k, m.test(sample)]));
      rows.push({ ...sample, results, extras: extra });
      }
    }
  }
  return rows;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bootstrap 95% interval on the mean of paired deltas (one per task), seeded. */
export function bootstrapDelta(deltas, resamples = 10000, seed = 1) {
  const rand = mulberry32(seed);
  const n = deltas.length;
  const means = [];
  for (let i = 0; i < resamples; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += deltas[Math.floor(rand() * n)];
    means.push(s / n);
  }
  means.sort((x, y) => x - y);
  return { mean: deltas.reduce((s, d) => s + d, 0) / n, low: means[Math.floor(0.025 * resamples)], high: means[Math.ceil(0.975 * resamples) - 1] };
}

/** Mean pass rate over runs, per task and arm, for one metric. */
function taskMeans(rows, key) {
  const byTask = new Map();
  for (const r of rows) {
    if (!byTask.has(r.task)) byTask.set(r.task, { bare: [], skill: [] });
    byTask.get(r.task)[r.condition].push(r.results[key] ? 1 : 0);
  }
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return [...byTask.entries()].map(([task, arms]) => ({ task, bare: mean(arms.bare), skill: mean(arms.skill), runs: Math.min(arms.bare.length, arms.skill.length) }));
}

export function table(rows) {
  // Runs from different skills measure different things; a table of them would mislead.
  // Runs recorded before meta.json named the skill all installed the core pack.
  const skills = new Set(rows.filter((r) => r.condition === "skill").map((r) => r.meta?.skill ?? "product-engineer"));
  if (skills.size > 1) throw new Error(`refusing to table runs of different skills together: ${[...skills].join(", ")}`);
  const conditions = ["bare", "skill"];
  const n = Object.fromEntries(conditions.map((c) => [c, rows.filter((r) => r.condition === c).length]));
  const repeated = rows.length > 0 && Object.keys(metrics).length > 0 && taskMeans(rows, Object.keys(metrics)[0]).every((t) => t.runs >= 2);
  const lines = [`| metric | bare (n=${n.bare}) | skill (n=${n.skill}) | delta | 95% CI on the mean delta |`, `|---|---|---|---|---|`];
  for (const [key, m] of Object.entries(metrics)) {
    const count = (c) => rows.filter((r) => r.condition === c && r.results[key]).length;
    const b = count("bare"), s = count("skill");
    let ci = "n/a (one run per arm)";
    if (repeated) {
      const deltas = taskMeans(rows, key).filter((t) => t.bare !== null && t.skill !== null).map((t) => t.skill - t.bare);
      const { low, high } = bootstrapDelta(deltas);
      ci = `${low.toFixed(2)} to ${high.toFixed(2)}`;
    }
    lines.push(`| ${m.title} | ${b} / ${n.bare} | ${s} / ${n.skill} | ${s - b >= 0 ? "+" : ""}${s - b} | ${ci} |`);
  }
  return lines.join("\n");
}

export function perTask(rows) {
  const keys = Object.keys(metrics);
  const lines = [`| task | condition | run | ${keys.join(" | ")} | docs elsewhere | turns | cost |`, `|---|---|---|${keys.map(() => "---").join("|")}|---|---|---|`];
  for (const r of rows) lines.push(`| ${r.task} | ${r.condition} | ${r.run} | ${keys.map((k) => (r.results[k] ? "yes" : "no")).join(" | ")} | ${r.extras.documentedElsewhere ? "yes" : "no"} | ${r.meta.turns ?? ""} | ${r.meta.cost_usd ? `$${r.meta.cost_usd.toFixed(2)}` : ""} |`);
  return lines.join("\n");
}

/** Every failing cell, with the evidence that made it fail. */
export function failures(rows) {
  const lines = [];
  for (const r of rows) {
    const failed = Object.entries(metrics).filter(([k]) => !r.results[k]);
    if (!failed.length) continue;
    for (const [key, m] of failed) {
      const why = m.why ? m.why(r) : "no evidence recorded";
      lines.push(`- ${r.task}, ${r.condition}${r.run > 1 ? `, run ${r.run}` : ""}: ${m.title.toLowerCase()}. ${why}`);
    }
  }
  return lines.length ? lines.join("\n") : "No failing cells.";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const rows = score(dir ? join(process.cwd(), dir) : root);
  if (process.argv.includes("--failures")) {
    console.log(failures(rows));
  } else {
    console.log(table(rows));
    console.log();
    console.log(perTask(rows));
    console.log();
    console.log("## Every failing cell\n");
    console.log(failures(rows));
  }
}
