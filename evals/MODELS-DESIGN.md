# Second-model study: design

Written before any run. Issue [#16](https://github.com/Bubblegunn/product-engineer/issues/16).

## Question

Does the skill change what an agent writes on a model other than the one the published numbers
came from? The published table is one model, `claude-opus-5`, one run per task.

## What is run

- The eight tasks in `evals/tasks/`, both arms (bare, skill), three runs per task per arm: 48 runs
  per model. Same prompts and flags as the published run; only `PE_EVAL_MODEL` changes.
- Models, in this order: `claude-haiku-4-5` (small and cheap, where a prompt-only intervention is
  most likely to fail), then `claude-sonnet-5-5` if the budget below allows it. Every model is a
  Claude model run through Claude Code, because `evals/run.sh` drives that CLI. A model from another
  family would need a gateway the CLI can use, and is not part of this study.
- One results directory per model, named `evals/results-<model>-<YYYY-MM-DD>`, committed in full,
  transcripts included.
- Budget: the whole plan, including the competitor runs in `docs/COMPARISON.md`, spends at most
  $60. A model is started only if its projected cost, from a two-run pilot, fits in what is left,
  and `PE_EVAL_BUDGET_USD` stops a run that passes its ceiling. A model that stops early is reported
  as incomplete, not dropped.

## What is measured

The five metrics in `evals/score.mjs`, unchanged, and the cost per run. The heuristics are regular
expressions over the agent's words; they were tuned on `claude-opus-5` output.

## How the result is read, fixed now

For each metric, `evals/by-model.mjs` takes the mean per-task difference between the skill arm and
the bare arm and its 95% bootstrap interval (seeded, 10,000 resamples, the interval `score.mjs`
already prints). The reading is:

- `worked`: the whole interval is above zero.
- `worse`: the whole interval is below zero.
- `no clear effect`: the interval contains zero.

With eight tasks the interval is wide, so `no clear effect` is an expected reading for a metric that
moves a little, and it means "this study cannot tell", not "the skill does nothing".

## What each outcome changes

- A metric that `worked` on a model supports the sentence "on this model, in this study" and no
  more.
- A metric that reads `no clear effect` or `worse` on any model is printed in
  `evals/RESULTS-models.md` with the same prominence as one that worked, and the README sentence
  that links to the study says which model and which metric.
- If the customer-block metric does not read `worked` on a model, the README says the effect was not
  shown on that model.

## Known limits, stated before the data

- If a model words things in a way the regular expressions miss, the heuristic scores it low. For
  every cell that fails on a model, the failing evidence (`node evals/score.mjs <dir> --failures`) is
  read and the write-up says whether the miss is the model's or the heuristic's. The heuristics are
  not changed after seeing the data; if they were wrong, both scorings are reported.
- Eight tasks, three runs each. The tasks were written by this repository.
- The bare arm and the skill arm share tasks, so the intervals describe these tasks, not tasks in
  general.
