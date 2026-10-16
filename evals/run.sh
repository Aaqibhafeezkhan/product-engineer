#!/bin/sh
# Runs every task in evals/tasks under two conditions, bare and skill, with
# Claude Code in headless mode, and stores what the agent said and committed.
#
#   sh evals/run.sh              # all tasks, both conditions
#   sh evals/run.sh 03 skill     # one task prefix, one condition
#   PE_EVAL_RUNS=3 sh evals/run.sh   # three runs per arm, results/<task>/<condition>/run-N
#   sh evals/run.sh --yes --overwrite   # replace the published run in evals/results
#   PE_EVAL_SKILL=customer-block sh evals/run.sh --yes   # install only skills/customer-block in the skill arm
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
[ -f "$root/skills/$skill/SKILL.md" ] || { echo "no skill named '$skill' under skills/" >&2; exit 1; }
yes="${PE_EVAL_YES:-}"
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
[ -n "${PE_EVAL_SKILL:-}" ] && skill_line="
  skill       $skill (installed in the skill arm only)"
cat <<INFO
product-engineer evals
  tasks       $task_count
  conditions  bare, skill$skill_line
  runs/arm    $runs
  total runs  $run_count
  model       $model
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
    mkdir -p "$out"
    work=$(mktemp -d)
    cp -R "$task"/. "$work"/
    rm -f "$work/TASK.md"
    if [ "$condition" = "skill" ]; then
      mkdir -p "$work/.claude/skills/$skill"
      cp -R "$root/skills/$skill"/. "$work/.claude/skills/$skill"/
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
      fs.writeFileSync(process.argv[3], JSON.stringify({ model: Object.keys(d.modelUsage || {}).join(",") || null, requested_model: process.argv[4] || null, cli: process.argv[5] || null, skill: process.argv[6] || null, cost_usd: d.total_cost_usd || null, turns: d.num_turns || null, duration_ms: d.duration_ms || null }) + "\n");
    ' "$out/transcript.json" "$out/final.md" "$out/meta.json" "$model" "$cli_version" "$([ "$condition" = skill ] && echo "$skill")"
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
    done
  done
done
echo "done: results in $results_dir"
if [ "$results_dir" != "$published_dir" ]; then
  echo "score this run:      node evals/score.mjs $results_dir"
  echo "the published run:   node evals/score.mjs"
fi
