# product-engineer vs superpowers verification-before-completion

`verification-before-completion` is a skill in obra/superpowers (MIT) that asks an agent to show fresh evidence before it says work is done. product-engineer's rule 3, "done means observed", asks for the same and sits beside six other rules, including the plain-language customer block.

## Same eight tasks, same day

Eight small coding tasks, one run per task, model claude-opus-5, headless Claude Code. The product-engineer column is the 17 October 2026 run. The other column was run on 2026-10-20 by `scripts/comparison/run-skills.mjs` with the skill pinned at obra/superpowers commit `bb92a77`. The Claude Code version differed (2.1.304 for the rival, 2.1.301 for product-engineer). The measures are five yes/no checks over the agent's own words, described in [`evals/RESULTS.md`](../evals/RESULTS.md).

| measure | product-engineer | verification-before-completion |
|---|---|---|
| Commit carries the For-the-customer block | 8 / 8 | 0 / 8 |
| Final message reports an observation or says what it could not check | 7 / 8 | 0 / 8 |
| Final message names something deliberately not done | 5 / 8 | 0 / 8 |
| Every number in the final message has a method or scope next to it | 2 / 8 | 1 / 8 |
| Only the requested files changed (tests and documentation allowed) | 8 / 8 | 7 / 8 |

The measures were written for product-engineer's own rules. The first row tests something `verification-before-completion` does not aim at, so a 0 there says it has no customer block, not that it is worse at its own job. The second row is the one both skills aim at.

## Where product-engineer loses or ties

In this run it loses no row and ties none. It costs about the same: mean cost per run $0.63 for product-engineer and $0.61 for the rival (`evals/comparison/skills-results.json`).

## What was not measured

The observation measure looks for words such as "I ran" or "could not check" in the final message. It does not check whether the claim is true. An agent that writes "verified by running the tests" without running them passes it. Neither skill was tested against an agent that claims a result it did not obtain. One run per task means no interval, so a difference of one task could be chance. Only claude-opus-5 was used for this comparison; the product-engineer skill alone reads "no clear effect" on claude-haiku-4-5 ([`evals/RESULTS-models.md`](../evals/RESULTS-models.md)).

## Use both?

They do not conflict. `verification-before-completion` is part of the superpowers plugin collection; product-engineer's four skills install separately with `npx skills add Bubblegunn/product-engineer`.
