# Proof, with the failures

Every block below is the real output of `sh scripts/proof-cases.sh`, which builds a throwaway git repository per
case, stages one change and runs `product-engineer check msg.txt --diff` on it. `test/proof.test.mjs` fails when this
page and the script's output differ, so the page cannot drift from the tool. Run the script yourself to see the same lines.

These are constructed changes, kept to one file so the cause is visible. They are not agent sessions and they are not a
success rate. They show what the check reports, what it only lists, and where it is wrong or blind. How often agent-written
commits make a claim a diff can contradict is not measured here: in the 112 commits recorded for the model runs in
[`evals/`](../evals/README.md) the check finds no contradicted test, documentation-only or file-count claim.

The before and after of a plain-language explanation is on the README, under "See it", and with a real defect in a public
repository in [`case-study.md`](case-study.md). The model results (the block appears on Opus 8 of 8, Sonnet 13 of 24, Haiku
0 of 24, and nothing shows the explanations are more accurate) are in the README table. No other effect is claimed.

### A false claim: tests added, none in the change

```
$ cat msg.txt
fix(total): ignore zero lines

I added tests for it.

For the customer:
What changed: Guests see the right total.
Why it matters: Invoices stop showing a wrong sum.

$ product-engineer check msg.txt --diff
ok    "For the customer:" block with "What changed:"
ok    "Why it matters:" present
ok    "Automation effect:" omitted (fine when no manual step disappeared)
info  cross-checked against 1 file at --cached: 1 source, 0 test, 0 documentation
warn  the message says tests were added; no test file gains a line in this change (1 file counted, 0 of them under a test path)
no errors, 1 warning
```

### A file said to be added is deleted

```
$ cat msg.txt
feat: added `src/old.js` for legacy lookups

For the customer:
What changed: Guests see the right total.
Why it matters: Invoices stop showing a wrong sum.

$ product-engineer check msg.txt --diff
ok    "For the customer:" block with "What changed:"
ok    "Why it matters:" present
ok    "Automation effect:" omitted (fine when no manual step disappeared)
info  cross-checked against 1 file at --cached: 1 source, 0 test, 0 documentation
warn  the message says it added `src/old.js`; the change deletes that file
no errors, 1 warning
```

### A name said to be removed is added

```
$ cat msg.txt
fix: removed the `audit` call from login

For the customer:
What changed: Guests see the right total.
Why it matters: Invoices stop showing a wrong sum.

$ product-engineer check msg.txt --diff
ok    "For the customer:" block with "What changed:"
ok    "Why it matters:" present
ok    "Automation effect:" omitted (fine when no manual step disappeared)
info  cross-checked against 1 file at --cached: 1 source, 0 test, 0 documentation
warn  the message says it removed `audit`; in the change it appears on 1 added line and on no removed line
no errors, 1 warning
```

### A bug fix that changed only documentation

```
$ cat msg.txt
fix: fixed the crash when a booking is empty

For the customer:
What changed: Guests see the right total.
Why it matters: Invoices stop showing a wrong sum.

$ product-engineer check msg.txt --diff
ok    "For the customer:" block with "What changed:"
ok    "Why it matters:" present
ok    "Automation effect:" omitted (fine when no manual step disappeared)
info  cross-checked against 1 file at --cached: 0 source, 0 test, 1 documentation
warn  the message says it fixes a bug; every file in the change is documentation (1: README.md), so no code changed
no errors, 1 warning
```

### No breaking changes, and an export is gone

```
$ cat msg.txt
refactor: tidy the api. No breaking changes.

For the customer:
What changed: Guests see the right total.
Why it matters: Invoices stop showing a wrong sum.

$ product-engineer check msg.txt --diff
ok    "For the customer:" block with "What changed:"
ok    "Why it matters:" present
ok    "Automation effect:" omitted (fine when no manual step disappeared)
info  cross-checked against 1 file at --cached: 1 source, 0 test, 0 documentation
warn  the message says nothing breaks; the change removes an exported name and defines no name like it again: `helper` (src/api.js). Check that it is not part of the public API
no errors, 1 warning
```

### What a diff cannot show: the tests ran

```
$ cat msg.txt
fix: tweak old. I ran the tests and they all pass.

For the customer:
What changed: Guests see the right total.
Why it matters: Invoices stop showing a wrong sum.

$ product-engineer check msg.txt --diff
ok    "For the customer:" block with "What changed:"
ok    "Why it matters:" present
ok    "Automation effect:" omitted (fine when no manual step disappeared)
info  cross-checked against 1 file at --cached: 1 source, 0 test, 0 documentation
info  claimed by the author and not checkable from a diff (tests were run or pass): "I ran the tests and they all pass."
no errors, 0 warnings
```

## Where it passes and is wrong or blind

### Failure: a test file with no test in it counts as tests added

```
$ cat msg.txt
fix: tweak old. Added tests.

For the customer:
What changed: Guests see the right total.
Why it matters: Invoices stop showing a wrong sum.

$ product-engineer check msg.txt --diff
ok    "For the customer:" block with "What changed:"
ok    "Why it matters:" present
ok    "Automation effect:" omitted (fine when no manual step disappeared)
info  cross-checked against 2 files at --cached: 1 source, 1 test, 0 documentation
ok    tests claimed and 1 test file gains lines
no errors, 0 warnings
```

### Failure: a Turkish message is not read for claims

```
$ cat msg.txt
feat: `src/old.js` eklendi, testler eklendi

For the customer:
What changed: Guests see the right total.
Why it matters: Invoices stop showing a wrong sum.

$ product-engineer check msg.txt --diff
ok    "For the customer:" block with "What changed:"
ok    "Why it matters:" present
ok    "Automation effect:" omitted (fine when no manual step disappeared)
info  cross-checked against 1 file at --cached: 1 source, 0 test, 0 documentation
no errors, 0 warnings
```

