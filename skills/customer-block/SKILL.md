---
name: customer-block
description: Use when writing a commit message or a pull request description for software other people use. Ends every message with a plain-language "For the customer" block, what changed, why it matters, and an automation effect only when a manual step really disappeared.
license: MIT
metadata:
  author: Efe Genc
  version: 0.6.0
  source: https://github.com/Bubblegunn/product-engineer
  measuredBy: [customerBlock]
  measuredGap: the run that moved this metric installed the core skill, not this one; the rule is measured, this extraction of it is not
---

# customer-block

Rule 2 of the product-engineer skill on its own, for teams that want the block and
nothing else. The full skill is `product-engineer` in the same repository.

## The block

Every commit message and every pull request description ends with:

```
For the customer:
What changed: <one or two sentences, no jargon, what they can now do or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only if a manual step disappeared or the system now handles more alone; otherwise omit the line>
```

Write the headings in the language your team writes. English, Turkish, Japanese and
Chinese are accepted as they are; for another language the team names its headings in
`.product-engineer.json`. The table is in the product-engineer skill,
`references/headings.md`.

Rules: no jargon a non-engineer would have to look up; a pure refactor gets one line
under `What changed`; a bug fix says what the customer saw before and sees now; never
invent an automation effect. Merge, fixup, squash and revert commits do not need the
block.

## Two pairs

A bug fix. Before:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment
```

After:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment

For the customer:
What changed: Things the system handles on its own no longer light up the phone or the menu badge; only items that need a person do.
Why it matters: The badge count means "something needs you" again, so people stop ignoring it.
Automation effect: Automatic housekeeping events are now fully handled without anyone looking at them.
```

A migration. Before:

```
chore: add composite index on (tenant_id, created_at) to bookings
```

After:

```
chore: add composite index on (tenant_id, created_at) to bookings

For the customer:
What changed: The bookings list for large hotels opens in under a second instead of several.
Why it matters: Reception staff open that list dozens of times a shift.
```

## Checking it

`npx product-engineer check <file>` reports whether a message carries the block and
whether it reads the way this skill asks. A commit-msg hook that refuses messages
without the block is in the repository under `scripts/`.
