---
name: release-notes
description: Use when writing release notes, a changelog entry, a status update or a "what's new" message for people who do not read code. Makes the agent lead with what the reader can do now, keep one line per change, explain every term, count every number, and list what is not in this release.
license: MIT
metadata:
  author: Efe Genc
  version: 0.4.0
  source: https://github.com/Bubblegunn/product-engineer
  measuredBy: [notShipped, numbersWithMethod]
  measuredGap: the metrics are scored on coding tasks; no task in evals/tasks writes release notes, so this skill is measured only through the rules it shares with the core skill
---

# release-notes

The product-engineer rules for an agent that writes about software rather than writing
it: release notes, changelog entries, status updates to a founder or a client, a
"what's new" message.

## Five rules

1. Lead with what the reader can do now. The first line of every entry is the
   outcome in the reader's words, not the component that changed. "You can export a
   month of bookings as a spreadsheet" before "Added CSV export endpoint".
2. One line per change, and the why in the same line. "You can X, so that Y." If a
   change has no reader-visible effect, it goes under a single line: "Behind the scenes:
   groundwork for <the next visible thing>."
3. Explain every term the first time. A word the reader would have to look up gets
   a short explanation in the sentence, then their word is used from then on.
4. Every number has its method next to it. "Loads in under a second (measured on the
   largest account, 40,000 bookings)". A number without its scope is not written.
5. Say what is not in this release. A closing `Not in this release:` list, one line
   each with the reason, so nobody searches for something that is not there.

## Shape

```
<Release name or date>

You can now <outcome>, so that <why it matters>.
You no longer <suffering>, because <what changed, in plain words>.
Behind the scenes: <groundwork, one line>.

Not in this release:
- <thing>: <why not now>
```

## Before and after

Before:

```
- Added CSV export endpoint with pagination
- Refactored pricing module
- Fixed race condition in badge counter
```

After:

```
You can now download a month of bookings as a spreadsheet, so month-end reconciliation stops being a copy-paste job.
The notification bell no longer lights up for things the system handled on its own; only items that need a person count.
Behind the scenes: the pricing rules moved into their own file, so the next pricing change is safer to ship.

Not in this release:
- Scheduled email of the export: nobody has asked; worth it when two customers do.
```

## When to skip this skill

Internal engineering changelogs read by engineers only. Say so in one line and use
conventional commit titles instead. The full seven-rule skill is `product-engineer` in
the same repository.
