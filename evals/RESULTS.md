# Results

Run on 5 September 2026 with Claude Code 2.1.261, model `claude-opus-5` (the CLI also used
`claude-haiku-4-5` for its own housekeeping calls). One run per task per condition, 16 runs,
about $7 in total. The transcripts, final messages, commit messages and changed-file lists
behind every cell are committed under `evals/results/`, so the table can be recomputed with
`node evals/score.mjs` without spending anything. Same tasks, same prompts, same flags; the only difference is whether
`skills/product-engineer/` was present in the repository's `.claude/skills/`.

Other models: [evals/RESULTS-models.md](evals/RESULTS-models.md) lists each model separately.

| metric | bare (n=8) | skill (n=8) | delta |
|---|---|---|---|
| Commit carries the For-the-customer block | 0 / 8 | 8 / 8 | +8 |
| Final message reports an observation or says what it could not check | 1 / 8 | 7 / 8 | +6 |
| Final message names something deliberately not done | 2 / 8 | 7 / 8 | +5 |
| Every number in the final message has a method or scope next to it | 1 / 8 | 1 / 8 | +0 |
| Only the requested files changed (tests and documentation allowed) | 8 / 8 | 8 / 8 | +0 |

Read it as a smoke test, not a study: eight tasks, one run each, no repetition, no
statistics. What it does show is that the three behaviours the skill is mostly about, the
customer block, done-means-observed, and naming what was left out, went from rare to
nearly always in the runs where the skill was present.

Rescored on 5 September 2026 with two heuristic fixes, without rerunning anything:
the number heuristic now strips code spans and fenced blocks and ignores versions, issue
numbers, years and hashes before it looks for a bare number, and the scope heuristic
treats documentation files as documentation rather than scope creep (the per-task table
still shows, as "docs elsewhere", when the agent wrote to a Markdown file the task did not
list). The first two scored rows moved as a result and are reported as measured:

- Numbers with a method next to them: 1 of 8 in both conditions. Under the old heuristic a
  backtick anywhere in the sentence counted as a method, which flattered both arms; without
  it, most sentences that mention a count in either condition state it bare. The skill did
  not move this in one run per task, and the row says so.
- Only the requested files changed: 8 of 8 in both conditions once documentation is allowed.
  Four skill runs and three bare runs wrote to README.md; the skill neither caused nor
  prevented that, and the column next to it now records it instead of penalising it.

Cost: the skill runs used about 60% more turns and 45% more cost on average (18.5 turns and
$0.53 against 11.5 turns and $0.37), because they verified more and wrote more. That is the
price of the behaviour, and it is stated here so nobody discovers it later.

## Each skill on its own (17 October 2026)

`customer-block` and `done-means-observed` are extractions of rules from the core skill, and until this
run they had only been measured through it. `PE_EVAL_SKILL` (0.6.1) lets the skill arm install one of
them alone. Run on 17 October 2026 with Claude Code 2.1.301 and `claude-opus-5`: one bare arm, the core
skill, and each extraction on its own, all on the same day against the same bare arm. One run per task
per arm, 32 runs, $15.87 in total. Everything is under `evals/results-2026-10-17/`; each of its three
directories scores on its own, for example `node evals/score.mjs evals/results-2026-10-17/customer-block`.

| metric | bare | core skill | `customer-block` alone | `done-means-observed` alone |
|---|---|---|---|---|
| Commit carries the For-the-customer block | 0 / 8 | 8 / 8 | 8 / 8 | 0 / 8 |
| Final message reports an observation or says what it could not check | 1 / 8 | 7 / 8 | 0 / 8 | 6 / 8 |
| Final message names something deliberately not done | 2 / 8 | 5 / 8 | 1 / 8 | 1 / 8 |
| Every number in the final message has a method or scope next to it | 0 / 8 | 2 / 8 | 2 / 8 | 3 / 8 |
| Only the requested files changed (tests and documentation allowed) | 7 / 8 | 8 / 8 | 8 / 8 | 8 / 8 |
| Mean turns / mean cost per run | 12.3 / $0.45 | 16.5 / $0.63 | 13.9 / $0.50 | 10.6 / $0.40 |

Each extraction moves the metric its rule is about, and not the other one: `customer-block` puts the
block on 8 of 8 commits and leaves the observation row at bare level, and `done-means-observed` takes
the observation row from 1 to 6 of 8 and adds no customer block. The core skill reproduced its 5
September result on those two rows (8 of 8, 7 of 8). Naming what was left out is a core-skill rule that
neither extraction carries, and neither moved it. The same limits apply as to the table above: one run
per task, regular expressions over the agent's own words. `release-notes` was not run, because no task
here writes release notes, so it still states its gap.

## What eight tasks cannot prove

Read the table as a smoke test, and hold it against these limits before quoting it.

- Eight tasks with one run each. There is no repetition, so a row that moved could have
  moved by chance. `PE_EVAL_RUNS=3` adds a seeded bootstrap interval; the published run
  does not have one.
- The heuristics are regular expressions over the agent's own words, so they reward
  saying the right thing. An agent that writes "verified by running the tests" without
  running them passes the observation row, and a run that genuinely checked something in
  wording the list does not contain fails it. Every failing cell is printed below with
  its evidence, so a reader can judge the call instead of trusting the tick.
- Skill selection is not deterministic. The same request can load a different set of
  skills depending on phrasing and on what else is installed, so the skill arm measures
  this skill present in a clean project, not that it will fire in yours.
- A skill can go stale. Some of what this one asks for is behaviour a newer model may do
  unprompted, at which point the delta shrinks for reasons that have nothing to do with
  the wording. The dated run above is a claim about that day, not a standing property.
- Nothing here measures whether the customer block is any good, only that it is present
  and that the message names an observation. `evals/judge.mjs` asks a model which of two
  commit messages is truer to the diff, and `BENCHMARK.md` designs a larger measurement
  on public commits. Neither has been run at scale.

## Per task

| task | condition | customerBlock | observedOrHonest | notShipped | numbersWithMethod | scopeRespected | docs elsewhere | turns | cost |
|---|---|---|---|---|---|---|---|---|---|
| 01-export-safari | bare | no | yes | yes | no | yes | no | 13 | $0.35 |
| 01-export-safari | skill | yes | yes | yes | yes | yes | no | 18 | $0.56 |
| 02-notification-badge | bare | no | no | no | no | yes | no | 10 | $0.25 |
| 02-notification-badge | skill | yes | yes | yes | no | yes | yes | 21 | $0.50 |
| 03-refactor-pricing | bare | no | no | no | yes | yes | yes | 12 | $0.39 |
| 03-refactor-pricing | skill | yes | no | yes | no | yes | yes | 16 | $0.49 |
| 04-slow-report | bare | no | no | no | no | yes | no | 17 | $0.81 |
| 04-slow-report | skill | yes | yes | no | no | yes | no | 28 | $0.93 |
| 05-timezone-count | bare | no | no | no | no | yes | yes | 14 | $0.49 |
| 05-timezone-count | skill | yes | yes | yes | no | yes | yes | 19 | $0.63 |
| 06-invoice-typo | bare | no | no | yes | no | yes | no | 6 | $0.16 |
| 06-invoice-typo | skill | yes | yes | yes | no | yes | no | 13 | $0.28 |
| 07-webhook-retry | bare | no | no | no | no | yes | no | 10 | $0.29 |
| 07-webhook-retry | skill | yes | yes | yes | no | yes | no | 15 | $0.47 |
| 08-remove-coupons | bare | no | no | no | no | yes | yes | 10 | $0.21 |
| 08-remove-coupons | skill | yes | yes | yes | no | yes | yes | 18 | $0.39 |

## Every failing cell

Generated by `node evals/score.mjs --failures` from the committed transcripts, so every
"no" in the table above can be read with its evidence, including the calls where the
heuristic is arguably harsh. Quoted text is the agent's own, in backticks.

- 01-export-safari, bare: commit carries the for-the-customer block. commit message has no "For the customer:" and "What changed:" lines; it starts `Fix CSV export doing nothing on Safari`
- 01-export-safari, bare: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `- **CSV escaping is unsafe.** Line 3 does with no quoting.`
- 02-notification-badge, bare: commit carries the for-the-customer block. commit message has no "For the customer:" and "What changed:" lines; it starts `Show count of notifications needing a person on the bell`
- 02-notification-badge, bare: final message reports an observation or says what it could not check. no word from the observation list (watched, checked, ran ... and saw, verified by, observed, could not check) appears in the final message
- 02-notification-badge, bare: final message names something deliberately not done. no phrase from the left-out list (not shipped, did not add, left out, out of scope, deliberately did not) appears in the final message
- 02-notification-badge, bare: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `Notification 4 ("Invoice 88 paid") has but :`
- 02-notification-badge, skill: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `**What I did:** added and wired it into ( ), 7 tests, and a README paragraph stating the counting rule.`
- 03-refactor-pricing, bare: commit carries the for-the-customer block. commit message has no "For the customer:" and "What changed:" lines; it starts `Split pricing rules into an independent rule list`
- 03-refactor-pricing, bare: final message reports an observation or says what it could not check. no word from the observation list (watched, checked, ran ... and saw, verified by, observed, could not check) appears in the final message
- 03-refactor-pricing, bare: final message names something deliberately not done. no phrase from the left-out list (not shipped, did not add, left out, out of scope, deliberately did not) appears in the final message
- 03-refactor-pricing, skill: final message reports an observation or says what it could not check. no word from the observation list (watched, checked, ran ... and saw, verified by, observed, could not check) appears in the final message
- 03-refactor-pricing, skill: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `All identical, green on all 3 tests.`
- 04-slow-report, bare: commit carries the for-the-customer block. commit message has no "For the customer:" and "What changed:" lines; it starts `Speed up monthlyReport by ~14x`
- 04-slow-report, bare: final message reports an observation or says what it could not check. no word from the observation list (watched, checked, ran ... and saw, verified by, observed, could not check) appears in the final message
- 04-slow-report, bare: final message names something deliberately not done. no phrase from the left-out list (not shipped, did not add, left out, out of scope, deliberately did not) appears in the final message
- 04-slow-report, bare: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `Both costs scale with total nights (~150k in my test data), but a monthly report only spans ~30 distinct dates`
- 04-slow-report, skill: final message names something deliberately not done. no phrase from the left-out list (not shipped, did not add, left out, out of scope, deliberately did not) appears in the final message
- 04-slow-report, skill: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `A 100k-booking month did ~750k date parses and ~750k ISO formats.`
- 05-timezone-count, bare: commit carries the for-the-customer block. commit message has no "For the customer:" and "What changed:" lines; it starts `Fix broken check-in reminders for guests with unresolved tim`
- 05-timezone-count, bare: final message reports an observation or says what it could not check. no word from the observation list (watched, checked, ran ... and saw, verified by, observed, could not check) appears in the final message
- 05-timezone-count, bare: final message names something deliberately not done. no phrase from the left-out list (not shipped, did not add, left out, out of scope, deliberately did not) appears in the final message
- 05-timezone-count, bare: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `**4 guests are affected** — ids 3, 6, 9, and 12.`
- 05-timezone-count, skill: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `**4 of 12.** Guests 3, 6, 9, and 12 — every guest with in .`
- 06-invoice-typo, bare: commit carries the for-the-customer block. commit message has no "For the customer:" and "What changed:" lines; it starts `Fix typo in invoice footer ("welcom" -> "welcome")`
- 06-invoice-typo, bare: final message reports an observation or says what it could not check. no word from the observation list (watched, checked, ran ... and saw, verified by, observed, could not check) appears in the final message
- 06-invoice-typo, bare: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `Two unrelated things I noticed in that file but left alone: on line 3 is dead code, and there's a TODO about m`
- 06-invoice-typo, skill: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `- runs clean but reports **0 tests** — there is no test suite here, so passing tests is not evidence of anythi`
- 07-webhook-retry, bare: commit carries the for-the-customer block. commit message has no "For the customer:" and "What changed:" lines; it starts `Retry the accounting webhook on transient failures`
- 07-webhook-retry, bare: final message reports an observation or says what it could not check. no word from the observation list (watched, checked, ran ... and saw, verified by, observed, could not check) appears in the final message
- 07-webhook-retry, bare: final message names something deliberately not done. no phrase from the left-out list (not shipped, did not add, left out, out of scope, deliberately did not) appears in the final message
- 07-webhook-retry, bare: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `** ** — up to 4 attempts with exponential backoff plus jitter (~250ms, 500ms, 1s).`
- 07-webhook-retry, skill: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `- Retries up to 4 times on network errors and 408/429/5xx, exponential backoff with full jitter (500ms base, 8`
- 08-remove-coupons, bare: commit carries the for-the-customer block. commit message has no "For the customer:" and "What changed:" lines; it starts `Remove retired coupon code path from checkout`
- 08-remove-coupons, bare: final message reports an observation or says what it could not check. no word from the observation list (watched, checked, ran ... and saw, verified by, observed, could not check) appears in the final message
- 08-remove-coupons, bare: final message names something deliberately not done. no phrase from the left-out list (not shipped, did not add, left out, out of scope, deliberately did not) appears in the final message
- 08-remove-coupons, bare: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `- passes but the suite is empty (0 tests), so it confirms nothing here.`
- 08-remove-coupons, skill: every number in the final message has a method or scope next to it. a number with no method or scope beside it: `On a 100 cart, returns with no argument and with both and passed as a stale second argument; those two previou`
