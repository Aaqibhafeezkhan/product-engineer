#!/bin/sh
# Runs every task in evals/tasks under two conditions, bare and skill, with
# Claude Code in headless mode, and stores what the agent said and committed.
#
#   sh evals/run.sh              # all tasks, both conditions
#   sh evals/run.sh 03 skill     # one task prefix, one condition
#   PE_EVAL_RUNS=3 sh evals/run.sh   # three runs per arm, results/<task>/<condition>/run-N
#   sh evals/run.sh --yes --overwrite   # replace the published run in evals/results
#   PE_EVAL_SKILL=customer-block sh evals/run.sh --yes   # install only skills/customer-block in the skill arm
#   PE_EVAL_SKILL_PATH=/abs/path/to/skill-dir sh evals/run.sh "" skill --yes   # install a skill from outside this repository
#       PE_EVAL_SKILL_SOURCE="owner/repo@sha" is recorded in meta.json beside it, so a result names what it ran
#   PE_EVAL_BUDGET_USD=5 sh evals/run.sh --yes   # never start a run that could take the total past $5 (exit 3)
#
# Requires the `claude` CLI, logged in. Each run costs real tokens, so the script
# prints what it is about to spend and stops unless you pass --yes (or set
# PE_EVAL_YES=1). The model is pinned so a rerun compares like with like; override
# with PE_EVAL_MODEL to measure a different one.
# Only project-level settings are loaded (--setting-sources project) so the
# machine's own CLAUDE.md and skills cannot leak into the bare condition.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
tasks_dir="$root/evals/tasks"
# A rerun writes to its own directory. evals/results holds the run published in
# RESULTS.md, and overwriting it by accident destroys the evidence behind the table.
published_dir="$root/evals/results"
results_dir="${PE_EVAL_OUT:-$root/evals/results-$(date -u +%Y%m%dT%H%M%SZ)}"
filter="${1:-}"
only_condition="${2:-}"
case "$filter" in --*) filter="" ;; esac
case "$only_condition" in --*) only_condition="" ;; esac
# Pinned: the published numbers in RESULTS.md were produced with this model, and an
# unpinned run silently compares against whatever the CLI defaults to that week.
model="${PE_EVAL_MODEL:-claude-opus-5}"
runs="${PE_EVAL_RUNS:-1}"
# The skill the skill arm installs. Defaults to the core pack; a single skill
# directory under skills/ lets that skill be measured on its own.
skill="${PE_EVAL_SKILL:-product-engineer}"
case "$skill" in
  */*|.*|"") echo "PE_EVAL_SKILL must be a skill directory name, not '$skill'" >&2; exit 1 ;;
esac
skill_src="$root/skills/$skill"
# A skill from outside this repository (a competitor, fetched into _upstream/) is installed from its
# own directory, under that directory's name. PE_EVAL_SKILL and PE_EVAL_SKILL_PATH together are ambiguous.
skill_source="${PE_EVAL_SKILL_SOURCE:-}"
if [ -n "${PE_EVAL_SKILL_PATH:-}" ]; then
  [ -z "${PE_EVAL_SKILL:-}" ] || { echo "set PE_EVAL_SKILL or PE_EVAL_SKILL_PATH, not both" >&2; exit 1; }
  skill_src="$PE_EVAL_SKILL_PATH"
  skill=$(basename "$skill_src")
fi
[ -f "$skill_src/SKILL.md" ] || { echo "no SKILL.md in $skill_src" >&2; exit 1; }
yes="${PE_EVAL_YES:-}"
# A ceiling on spend. Before each run the guard requires spent < ceiling and spent + max_single <= ceiling,
# where max_single is the largest single-run cost seen in this invocation (0 before the first run). The first
# run is therefore always allowed while spent < ceiling. A later run can still cost more than max_single;
# when it does, the after-check below reports the overshoot and stops (exit 3).
budget="${PE_EVAL_BUDGET_USD:-}"
if [ -n "$budget" ] && ! printf '%s\n' "$budget" | grep -Eq '^[0-9]+(\.[0-9]+)?$'; then
  echo "PE_EVAL_BUDGET_USD must be a number of dollars such as 5 or 2.50, not '$budget'" >&2; exit 1
fi
spent=0
max_single=0
overwrite=""
for arg in "$@"; do
  [ "$arg" = "--yes" ] && yes=1
  [ "$arg" = "--overwrite" ] && overwrite=1
done
[ -n "$overwrite" ] && results_dir="$published_dir"
mkdir -p "$results_dir"

cli_version=$(claude --version 2>/dev/null | head -1 || echo "unknown")
task_count=$(find "$tasks_dir" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d " ")
run_count=$((task_count * 2 * runs))
skill_line=""
[ -n "${PE_EVAL_SKILL:-}${PE_EVAL_SKILL_PATH:-}" ] && skill_line="
  skill       $skill (installed in the skill arm only)"
[ -n "$skill_source" ] && skill_line="$skill_line
  source      $skill_source"
cat <<INFO
product-engineer evals
  tasks       $task_count
  conditions  bare, skill$skill_line
  runs/arm    $runs
  total runs  $run_count
  model       $model
  budget      ${budget:-none} USD
  cli         $cli_version
  results     $results_dir
The 16-run baseline in evals/RESULTS.md cost about \$7. This run costs real tokens.
INFO
if [ -z "$yes" ]; then
  echo "Nothing has run. Add --yes (or PE_EVAL_YES=1) to spend it."
  exit 1
fi

for task in "$tasks_dir"/*/; do
  name=$(basename "$task")
  case "$name" in "$filter"*) ;; *) continue ;; esac
  for condition in bare skill; do
    if [ -n "$only_condition" ] && [ "$condition" != "$only_condition" ]; then continue; fi
    for run in $(seq 1 "$runs"); do
    if [ "$runs" = 1 ]; then out="$results_dir/$name/$condition"; else out="$results_dir/$name/$condition/run-$run"; fi
    if [ -n "$budget" ] && ! awk -v a="$spent" -v m="$max_single" -v b="$budget" 'BEGIN { exit !(a < b && a + m <= b) }'; then
      echo "budget of \$$budget would be passed by the next run: spent \$$spent so far, largest run \$$max_single; stopping before it. Results so far are in $results_dir" >&2
      exit 3
    fi
    mkdir -p "$out"
    work=$(mktemp -d)
    cp -R "$task"/. "$work"/
    rm -f "$work/TASK.md"
    if [ "$condition" = "skill" ]; then
      mkdir -p "$work/.claude/skills/$skill"
      cp -R "$skill_src"/. "$work/.claude/skills/$skill"/
    fi
    (
      cd "$work"
      git init -q -b main
      git -c user.name=Fixture -c user.email=fixture@example.com add -A
      git -c user.name=Fixture -c user.email=fixture@example.com commit -q -m "fixture"
    )
    # The request is the body of TASK.md after the front matter.
    prompt=$(awk 'BEGIN{fm=0} /^---$/{fm++; next} fm>=2{print}' "$task/TASK.md")
    if [ "$runs" = 1 ]; then echo "== $name / $condition"; else echo "== $name / $condition / run $run"; fi
    set +e
    (
      cd "$work"
      env -u CLAUDECODE claude -p "$prompt" \
        --output-format json \
        --max-turns 25 \
        --permission-mode acceptEdits \
        --setting-sources project \
        --allowedTools "Edit,Write,Bash,Read,Glob,Grep,Skill" \
        ${model:+--model "$model"} \
        > "$out/transcript.json" 2> "$out/stderr.txt"
    )
    status=$?
    set -e
    echo "$status" > "$out/exit.txt"
    node -e '
      const fs = require("fs");
      let d = {};
      try { d = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch {}
      fs.writeFileSync(process.argv[2], (d.result || "") + "\n");
      fs.writeFileSync(process.argv[3], JSON.stringify({ model: Object.keys(d.modelUsage || {}).join(",") || null, requested_model: process.argv[4] || null, cli: process.argv[5] || null, skill: process.argv[6] || null, source: process.argv[7] || null, cost_usd: d.total_cost_usd || null, turns: d.num_turns || null, duration_ms: d.duration_ms || null }) + "\n");
    ' "$out/transcript.json" "$out/final.md" "$out/meta.json" "$model" "$cli_version" "$([ "$condition" = skill ] && echo "$skill")" "$([ "$condition" = skill ] && echo "$skill_source")"
    (
      cd "$work"
      if [ "$(git rev-list --count HEAD)" -gt 1 ]; then
        git log -1 --format=%B > "$out/commit.txt"
        git diff --name-only HEAD~1 HEAD > "$out/changed.txt"
      else
        : > "$out/commit.txt"
        git status --porcelain | awk '{print $2}' > "$out/changed.txt"
      fi
    )
    rm -rf "$work"
    if [ -n "$budget" ]; then
      cost=$(node -e 'let c = NaN; try { c = Number(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).cost_usd) } catch {} console.log(c > 0 ? String(c) : "missing")' "$out/meta.json")
      if [ "$cost" = "missing" ]; then
        echo "no positive cost_usd in $out/meta.json, so the spend guard cannot be trusted; stopping. Results so far are in $results_dir" >&2
        exit 3
      fi
      spent=$(awk -v a="$spent" -v b="$cost" 'BEGIN { printf "%.4f", a + b }')
      max_single=$(awk -v a="$max_single" -v c="$cost" 'BEGIN { printf "%.4f", (c > a ? c : a) }')
      echo "   spent so far: \$$spent of \$$budget"
    fi
    if [ -n "$budget" ] && awk -v a="$spent" -v b="$budget" 'BEGIN { exit !(a > b) }'; then
      echo "budget of \$$budget exceeded after \$$spent; stopping. Results so far are in $results_dir" >&2
      exit 3
    fi
    done
  done
done
echo "done: results in $results_dir"
if [ "$results_dir" != "$published_dir" ]; then
  echo "score this run:      node evals/score.mjs $results_dir"
  echo "the published run:   node evals/score.mjs"
fi
