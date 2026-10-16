# Evals

A small, reproducible before/after of what the skill changes in a coding agent.

- `tasks/` holds eight tiny repositories, each with a `TASK.md` whose front matter lists the files the request should touch and whose body is the request in a stakeholder's voice.
- `run.sh` runs every task twice with Claude Code in headless mode: `bare` (nothing installed) and `skill` (this skill copied into `.claude/skills/`). Only project settings are loaded, so the machine's own CLAUDE.md and skills cannot leak into the bare condition. Each run's final message, commit message and changed files land in `results/<task>/<condition>/`.
- `score.mjs` applies five yes/no heuristics and prints the table in `RESULTS.md`. With `PE_EVAL_RUNS=3` each arm runs three times per task, results land in `run-N/` directories, and the table gains a seeded bootstrap interval on the mean per-task delta.
- `judge.mjs` asks a model which of the two commit messages is truer to the diff, in a random order per pair; it prints the pair count and cost and runs nothing without `--yes`.
- `BENCHMARK.md` is the design for a fifty-diff measurement on public commits. Design only.

```
sh evals/run.sh                        # prints the plan and the cost, runs nothing
sh evals/run.sh --yes                  # 16 headless runs into evals/results-<timestamp>
PE_EVAL_RUNS=3 sh evals/run.sh --yes   # 48 runs
PE_EVAL_SKILL=customer-block sh evals/run.sh --yes   # the skill arm installs only that skill
sh evals/run.sh --yes --overwrite      # replace the published run in evals/results
node evals/score.mjs                   # table, per-task rows, and every failing cell
node evals/score.mjs evals/results-... # score your own run instead
node evals/judge.mjs                   # pair count and cost; add --yes to judge
```

Three things make a rerun comparable with the published one. The model is pinned to
`claude-opus-5` in `run.sh`, because an unpinned run silently compares against whatever
the CLI defaults to that week; override it with `PE_EVAL_MODEL`. The `claude --version`
string and the requested model are written into every `meta.json`, so a result carries
the versions that produced it. And a rerun writes to `evals/results-<timestamp>` rather
than over `evals/results`, which holds the run the table in `RESULTS.md` is built from.

`PE_EVAL_SKILL` names one directory under `skills/` for the skill arm to install instead of the
core pack, so `customer-block`, `done-means-observed` and `release-notes` can be measured on their
own. `meta.json` records it as `skill`, and `score.mjs` refuses to put runs of different skills in
one table. Runs recorded before `meta.json` named the skill count as `product-engineer`.

`node evals/score.mjs --failures` prints every cell that failed together with the
evidence: the commit line that had no block, the sentence that carried a bare number,
the files a run touched that the task did not list.

The heuristics are regular expressions over the agent's own words and `git diff --name-only`. They are cheap and blunt on purpose; `RESULTS.md` lists what they miss.
