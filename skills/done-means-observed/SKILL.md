---
name: done-means-observed
description: Use when reporting that a piece of software work is finished. Makes the agent report what it watched happen in logs, data or on a real device, and say exactly what it could not check, instead of calling work done because tests pass.
license: MIT
metadata:
  author: Efe Genc
  version: 0.4.0
  source: https://github.com/Bubblegunn/product-engineer
  measuredBy: [observedOrHonest]
  measuredGap: the run that moved this metric installed the core skill, not this one; the rule is measured, this extraction of it is not
---

# done-means-observed

Rule 3 of the product-engineer skill on its own. Work is done when you have watched it
behave, or when you have written down which observation you could not make and why.
"Tests pass" is the entry ticket, not the report.

## The report

Before saying done, tick what you did and name what you could not:

- [ ] I watched the change behave in production logs, or in the environment closest to it.
- [ ] I looked at the data it wrote (a row, a document, a file), not only the response code.
- [ ] I tried it on a real device or browser when the change is visible to a person.
- [ ] I tried the failure path once (bad input, timeout, missing permission).
- [ ] The customer-facing text was read by someone who did not write it, or I read it aloud.

Then write the report in this shape:

```
Watched: <what you saw, where, with the command or the screen it came from>
Could not check: <what, and why>
```

Never write "done" with an empty `Watched` line. If nothing could be observed, say
"Not observed yet" as the first words of the report and list what would let you observe it.

## Before and after

Before:

```
Done. All 42 tests pass.
```

After:

```
Watched it in staging logs: 3 of 3 webhook retries logged, final failure recorded with the booking id.
Could not check: production, no deploy yet.
```

## Where this comes from

Lean practice calls it "go and see": the report comes from the place the work happened,
not from the desk. The full seven-rule skill is `product-engineer` in the same repository.
