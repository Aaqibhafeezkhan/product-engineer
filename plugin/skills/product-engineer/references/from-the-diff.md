# Writing the block from the diff

The block goes wrong when it is written from memory of the request instead of from the
change that actually landed. The request was a plan; the diff is what happened. Read the
diff first, then answer three questions from it.

Start with the shape, then the detail:

```sh
git diff --stat            # which files, how much
git diff                   # the change itself
git log -1 --format=%B     # what the last commit already claimed, if you are amending
```

## What changed

Name the behaviour, not the edit. Find the line a user's path reaches: the handler, the
render, the query, the message that gets sent. If the diff only moves code between files
and every call site keeps its arguments and its result, the honest answer is that nothing
changed for anyone, and the block says so in one line.

Ask of each hunk: if I stood next to someone using this, what would look different? If the
answer for every hunk is "nothing", it is a refactor. If the answer is "the number in the
corner is smaller", that is the sentence.

## Who it affects

The diff names them if you follow the call path outward. A change under an admin route
affects staff, not guests. A change in a nightly job affects whoever reads its output
tomorrow morning. A change behind a flag that is off affects nobody yet, and the block
should say that the flag is off, because a reader will otherwise assume it is live.

When two groups are affected differently, name the one who did not ask. The person who
requested the change already knows.

## What was deliberately not built

This is the part the diff shows better than memory: look for what a reader would expect to
be there and is not. A fix in one of three call sites. A validation added on the server and
not in the form. An error handled for the empty case and not for the malformed one. A test
that covers the path you fixed and not the neighbouring one.

Each of those is either a bug you are about to ship or a decision. If it is a decision,
write it under `Not shipped:` with the reason, in the form `- <thing>: <why not now>`. If
you cannot give a reason, it was not a decision.

## Evidence, not test counts

`What changed` describes the behaviour and `Why it matters` describes the benefit. Neither
line is a place to report that the suite is green. A passing suite says the code does what
its tests say; it does not say a person got anything. Name what you watched: the row in the
table, the line in the log, the screen on a device, the number before against the number
after. When you could not watch it, write the sentence that says so and why, and the block
is still honest.

`product-engineer check` warns when a block offers passing tests as its evidence and the
message names no observation anywhere.

## Worked example

The diff replaced one byte inside a string literal, a raw NUL with its escape:

```diff
-  return n === 1 || fnv1a(seed + "<a raw NUL byte>" + path) % n === 0;
+  return n === 1 || fnv1a(seed + "\u0000" + path) % n === 0;
```

From the diff alone: the string is identical, so the sampling is identical, so no number
this tool prints can change. What changed is not the behaviour but the file, because git
treats a file containing a raw NUL byte as binary and refuses to show a text diff for it.

```
For the customer:
What changed: Changes to the tool's main file show up as readable diffs again, on GitHub and locally.
Why it matters: Anyone reviewing a change to it, including someone sending their first contribution, can see what they are reviewing.
```

Who it affects came from the call path: nobody running the tool, everybody reading it. What
was not built came from what the diff does not contain: no test asserts the file stays
text, so a later edit could reintroduce the byte. That belongs under `Not shipped:` with a
reason, or in the same commit.
