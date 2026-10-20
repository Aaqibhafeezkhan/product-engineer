# product-engineer vs changelog-generator

`changelog-generator` is a skill in ComposioHQ/awesome-claude-skills that turns a project's git commits into a changelog written for customers. product-engineer asks the agent to write the plain-language text at the moment of the commit and checks it. One works after the fact from history; the other works at commit time.

## Same eight tasks, same day

Eight small coding tasks, one run per task, model claude-opus-5, headless Claude Code. The product-engineer column is the 17 October 2026 run. The `changelog-generator` column was run on 2026-10-20 by `scripts/comparison/run-skills.mjs`. No licence was detected for that repository, so the skill was run and nothing of its text is in this repository. The measures are five yes/no checks over the agent's own words, written for product-engineer's rules ([`evals/RESULTS.md`](../evals/RESULTS.md)).

| measure | product-engineer | changelog-generator |
|---|---|---|
| Commit carries the For-the-customer block | 8 / 8 | 0 / 8 |
| Final message reports an observation or says what it could not check | 7 / 8 | 0 / 8 |
| Final message names something deliberately not done | 5 / 8 | 1 / 8 |
| Every number in the final message has a method or scope next to it | 2 / 8 | 2 / 8 |
| Only the requested files changed (tests and documentation allowed) | 8 / 8 | 7 / 8 |

## Where product-engineer loses or ties

It ties the numbers row, 2 / 8 each. It loses no other row. The rows do not test what `changelog-generator` is for, so these counts say nothing about which skill writes a better changelog.

## What was not measured

None of the eight tasks asks an agent to write release notes or a changelog, so the headline feature of `changelog-generator`, writing a changelog from commits, was not measured at all. product-engineer has the `release-notes` skill, which gives an agent rules for writing about software, and no command that builds a changelog from a commit range. This page cannot say which tool produces the better changelog. The comparison measures only what the agent did on coding tasks with each skill installed.

## Use both?

Yes. The customer block in each commit is the kind of input a changelog generator can use. The two do not conflict.
