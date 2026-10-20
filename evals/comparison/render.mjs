#!/usr/bin/env node
// Writes docs/COMPARISON.md from the committed result files. Nothing in the document is typed by
// hand: the run date, the versions and every row come from checker-results.json and, when it
// exists, skills-results.json. A row where product-engineer loses is printed like any other and is
// repeated under "Where product-engineer loses".
//
//   node evals/comparison/render.mjs            # write docs/COMPARISON.md
//   node evals/comparison/render.mjs --check    # exit 1 when docs/COMPARISON.md is not what the results produce
//
// Node built-ins only.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS } from "./cases.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
export const DOC = join(root, "docs", "COMPARISON.md");
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

export function renderChecker(checker) {
  const lines = [];
  const t = checker.tool;
  lines.push(
    "## Checker: product-engineer check against commitlint",
    "",
    `Run on ${checker.runDate} with product-engineer ${checker.ourVersion} and ${t.name} ${t.version} (${t.licence}, extending \`${t.config}\`, source pinned at \`${t.commit.slice(0, 7)}\`).`,
    "Both tools were given the same message text. Nothing here calls a model.",
    "",
    "A tool is right when it flags a message that has a defect in the row's area, or passes one that has none. \"flagged\" means product-engineer reported an error or a warning, or commitlint exited non-zero. \"cannot\" means the tool is never shown the input that exposes the defect.",
    "",
    "| case | area | defect | product-engineer | commitlint | verdict |",
    "|---|---|---|---|---|---|",
  );
  for (const r of checker.rows) {
    lines.push(`| ${cell(r.title)} (\`${r.id}\`) | ${cell(AREAS[r.area] ?? r.area)} | ${r.defect ? "yes" : "no"} | ${r.ours.outcome} | ${r.theirs.outcome}${r.theirs.detail && r.theirs.outcome === "flagged" ? ` (${cell(r.theirs.detail)})` : ""} | ${r.verdict.replace("ours", "product-engineer")} |`);
  }
  lines.push("", "The first three areas test what product-engineer is built to do; commitlint was not built for them, so a win there says the feature exists and nothing about commitlint's quality. The Conventional Commits area is commitlint's own job, and it wins it.", "", "### Per area", "", "| area | cases | product-engineer right | commitlint right |", "|---|---:|---:|---:|");
  for (const area of Object.keys(AREAS)) {
    const rows = checker.rows.filter((r) => r.area === area);
    if (!rows.length) continue;
    const right = (who) => rows.filter((r) => (r.defect ? r[who].outcome === "flagged" : r[who].outcome === "passed")).length;
    lines.push(`| ${cell(AREAS[area])} | ${rows.length} | ${right("ours")} | ${right("theirs")} |`);
  }
  const losses = checker.rows.filter((r) => r.verdict === "ours loses");
  lines.push("", "### Where product-engineer loses", "");
  if (!losses.length) lines.push("No case in this run.");
  for (const r of losses) lines.push(`- ${r.title} (\`${r.id}\`): commitlint flags it (${r.theirs.detail || "no rule named"}); product-engineer passes it. product-engineer has no check for this (area: ${AREAS[r.area]}).`);
  lines.push(
    "",
    "The two tools do different jobs and are meant to run together: product-engineer ships a commitlint plugin (`product-engineer/commitlint`) that adds the customer-block rule to a commitlint setup.",
  );
  return lines.join("\n");
}

export function renderSkills(skills, pins) {
  const lines = ["## Skill: product-engineer against other skills on the same eight tasks", ""];
  if (!skills) {
    lines.push("Not run yet. The runs call a model and cost money; `scripts/comparison/run-skills.mjs` prints the plan and the estimated cost and runs nothing without `--yes`.");
    return lines.join("\n");
  }
  const ref = skills.reference;
  lines.push(
    `Run on ${skills.runDate}. Every arm is the same eight tasks, one run per task, model \`${ref.model}\`, headless Claude Code, scored by \`evals/score.mjs\` (five yes/no heuristics, described in \`evals/RESULTS.md\`). The bare arm and the product-engineer arm are the published 17 October run (\`${ref.dir}\`); the other skills were run later by \`scripts/comparison/run-skills.mjs\`.`,
    "",
    "The heuristics were written for product-engineer's own rules. A skill that does not aim at one of them scores low on that row by design, and that is shown as measured rather than hidden.",
    "",
  );
  const mismatched = skills.arms.filter((a) => a.id !== "bare" && (a.model !== ref.model || a.cli !== ref.cli));
  for (const a of mismatched) lines.push(`Note: the \`${a.id}\` arm ran with model \`${a.model}\` and CLI \`${a.cli}\`; the reference arms used \`${ref.model}\` and \`${ref.cli}\`.`, "");
  const head = skills.arms.map((a) => a.label);
  lines.push(`| metric | ${head.join(" | ")} |`, `|---|${head.map(() => "---:").join("|")}|`);
  for (const m of skills.metrics) lines.push(`| ${cell(m.title)} | ${skills.arms.map((a) => `${a.counts[m.key]} / ${a.n}`).join(" | ")} |`);
  lines.push(`| mean cost per run | ${skills.arms.map((a) => (a.meanCostUsd == null ? "n/a" : `$${a.meanCostUsd.toFixed(2)}`)).join(" | ")} |`);
  const ours = skills.arms.find((a) => a.id === "product-engineer");
  const rivals = skills.arms.filter((a) => a.id !== "bare" && a.id !== "product-engineer");
  lines.push("", "### Where product-engineer loses or ties", "");
  let any = false;
  for (const rv of rivals) {
    for (const m of skills.metrics) {
      const o = ours.counts[m.key];
      const t = rv.counts[m.key];
      if (t > o) { lines.push(`- LOSS: ${m.title}: product-engineer ${o} / ${ours.n}, ${rv.id} ${t} / ${rv.n}.`); any = true; }
      else if (t === o) { lines.push(`- tie: ${m.title}: both ${o} / ${ours.n} (${rv.id}).`); any = true; }
    }
  }
  if (!any) lines.push("No row in this run.");
  if (skills.notRun?.length) {
    lines.push("", "### Not run", "");
    for (const n of skills.notRun) lines.push(`- \`${n.id}\`: ${n.reason}`);
  }
  lines.push(
    "",
    "### What these tasks do not measure",
    "",
    "None of the eight tasks asks an agent to write release notes or a changelog, so the headline feature of a changelog skill is not measured here at all. This is a stated gap, not a win for either side.",
  );
  return lines.join("\n");
}

export function renderComparison({ checker, skills, pins }) {
  const out = [
    "# How product-engineer compares",
    "",
    "<!-- Generated by evals/comparison/render.mjs from evals/comparison/checker-results.json and skills-results.json. Do not edit by hand. -->",
    "",
    "Every number below comes from a run anyone can repeat with the commands in `evals/comparison/`. Competitors are pinned in `scripts/comparison/pins.json` and fetched into a gitignored `_upstream/` directory; none of their code is part of this repository. Rows where product-engineer loses stay in the tables.",
    "",
    renderChecker(checker),
    "",
    renderSkills(skills, pins),
    "",
    "## Tools considered and not run",
    "",
    "| tool | licence | why it was not run |",
    "|---|---|---|",
  ];
  for (const c of pins.considered) out.push(`| ${cell(c.name)} | ${cell(c.licence)} | ${cell(c.why)} |`);
  out.push("");
  return out.join("\n");
}

function load(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

function main(argv) {
  const checker = load(join(here, "checker-results.json"));
  if (!checker) {
    console.error("evals/comparison/checker-results.json is missing; run evals/comparison/checker.mjs first");
    return 1;
  }
  const text = renderComparison({ checker, skills: load(join(here, "skills-results.json")), pins: load(join(root, "scripts", "comparison", "pins.json")) });
  if (argv.includes("--check")) {
    const current = existsSync(DOC) ? readFileSync(DOC, "utf8") : "";
    if (current !== text) {
      console.error("docs/COMPARISON.md is not what the committed results produce; run node evals/comparison/render.mjs");
      return 1;
    }
    return 0;
  }
  writeFileSync(DOC, text);
  console.log(`wrote ${DOC}`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
