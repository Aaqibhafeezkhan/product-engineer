# Why the skill does not show an effect on weaker models: what the existing data says

Written 2 November 2026 from the committed runs only. No model was run for this page. Each answer says whether it was
measured, read in a file, or is unknown. The runs are the ones in [`RESULTS-models.md`](RESULTS-models.md).

## Does the skill load?

Not recorded. `run.sh` saves the final result and the token usage of each run, not the tool calls, so a call to the Skill tool
cannot be read from any transcript. The cost and turn counts can be compared instead (`node evals/skill-load-signal.mjs <results dir>`).
A skill that loads costs one tool call (one more turn) and adds its text to the cached input.

| model | skill-arm runs | extra turns against the bare mean of the same task | extra cache-creation tokens |
|---|---|---|---|
| claude-sonnet-5-5, commit has the block | 13 | +2.3 | +2,910 |
| claude-sonnet-5-5, commit has no block | 11 | +0.3 | +617 |
| claude-haiku-4-5, commit has no block | 24 | -0.2 | -300 |

Measured: the Sonnet runs that wrote the block are the runs that spent extra turns and tokens, and the Haiku skill runs spent
none. That fits the reading "the skill was loaded in the Sonnet runs that used it and was not loaded in the others, Haiku included".
It does not prove it. The skill sits in `.claude/skills/`, the task prompt never names it, and the model has to choose from the
skill's one-sentence description to open it. On Sonnet the miss is concentrated: `06-invoice-typo` and `08-remove-coupons` carry the
block in 0 of 3 runs each, the other six tasks in 13 of 18.

## Is the effect lost in a long conversation?

Unknown. The runs last 4 to 28 turns, with the request in the first message. Issue
[#19](https://github.com/Bubblegunn/product-engineer/issues/19) asks for the study and nobody has run it.

## Are the instructions too long?

Unknown. The main `SKILL.md` is about 700 words and its reference files about 3,200 more. If the skill is not opened, its length
does not matter for those runs, and in the runs where it was opened (Sonnet) the block appears. The data has no arm that tests
a shorter skill, so length and loading cannot be separated.

## Do the rules conflict with other agent instructions?

Unknown, not tested. The fixtures hold no `CLAUDE.md`, `AGENTS.md` or other instruction file, and `run.sh` loads project
settings only, so no competing instruction was present.

## Can a model pass by writing the expected phrase?

Yes, by construction. The five measures are regular expressions over the agent's own words and over file names
([`score.mjs`](score.mjs)); [`RESULTS.md`](RESULTS.md) says so. The block measure is two line prefixes, `For the customer:` and
`What changed:`. It does not read what follows. The runs do not keep the diff, only the commit message, the final message and the
names of the changed files, so the truth of the block cannot be re-checked from stored data. What can be checked with the file
names: in the 112 recorded commits (Haiku, Sonnet, Opus core) the diff check finds no contradicted tests, documentation-only or
file-count claim. That says these eight small tasks gave an agent little chance to make a checkable false claim; it does not say the blocks are accurate.

## What would settle it

1. Record the tool calls (`--output-format stream-json`) and the full diff of every run, so loading and accuracy are read
   directly. Costs nothing extra per run.
2. Judge accuracy and comprehension blind, on real diffs, not with a regular expression. A design with cost is in the lane report.
