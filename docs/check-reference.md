# Check reference

Details of `product-engineer check` that the README links to. The README keeps the short version.

## Cited paths

A message that says the fix is
in `src/gate.ts:120` is claiming something a reader will act on, and the line number is the part that
rots while the sentence stays still. Every `path/to/file.ext` and every GitHub Actions run URL in the
message is resolved: a missing file, a directory, or a line past the end of a real file is a warning,
`--references error` makes it an error and `--references off` turns it off. A message that cites
nothing is reported as citing nothing, at info level, and passes in every mode. That is deliberate:
a check that demanded a link would be satisfied by a link typed from memory, and the first person to
learn it was wrong would be the reader who followed it. Suggested by
[@raju_dandigam](https://dev.to/raju_dandigam), who asked for machine-checkable evidence without the
block turning into boilerplate. Nothing here makes a network request, so a run URL is checked for
shape only and says so.

## Readability

The block also gets a readability line, Flesch (1948) for English or Ateşman (1997) with
`--lang tr`, plus LIX (Björnsson, 1968), as information only. All three count syllables or
word lengths in the Latin alphabet, so for a block written in any other script the tool names
the script, says it is not scoring and why, and prints no number. Japanese, Chinese, Korean,
Arabic, Hebrew and Thai each get their own reason; Cyrillic, Greek and Devanagari are refused
because no calibration for them is implemented here, not because the language resists one; and
a script the tool cannot name is still refused. Before that, a block in Hindi, Tamil, Greek or
Amharic came back Flesch 0, graded hard, which is a number nobody counted.

## What `--diff` can decide, and what it cannot

A diff holds files, lines, and which side of the change each line is on. It holds no execution, no
intent and no knowledge of who the callers are. So:

| claim in the message | decidable from the diff alone | how |
|---|---|---|
| tests were added | yes, for test files and for a Rust or Python test written inside a source file | a test path gains a line, or an added line starts a test |
| documentation only, comments only | yes | file types; for comments, every changed line is a comment |
| a bug was fixed | partly: it refutes the claim when every changed file is documentation, it cannot confirm it | file types |
| a file was added or removed | yes | the status git reports for that path |
| a named function, flag or class was added or removed | partly: it refutes the claim when the name appears only on the opposite side | changed lines, no context |
| authentication, permissions and similar were added or removed | partly, the same way, for six words | changed lines |
| nothing breaks | partly: it refutes the claim when an exported name disappears | removed `export`, `pub`, capitalised Go `func`, public Python `def` and `class`, absent from every added line. It cannot know whether the name was public API |
| the tests ran, they pass, it was tried by hand, it is 40% faster | no | listed as claimed only |
| "added authentication" in prose that names no code | no | only the six words above are read |
| a message in a language other than English | no | not read; passes silently |

Everything the check cannot refute passes. A pass means "no contradiction found", never "true".

### False alarms on public commits

Run on 2 November 2026 with `readDiff` and `crossCheck`: each commit's message against its own change, over the last 600
non-merge commits of each repository, working tree at the repository's head. Two corpora.

- **Tuned on**: express, flask, fastify, requests, ripgrep, gin, execa, vite. 4,796 commits with a readable parent.
- **Second corpus**: tokio, cobra, click, httpx, commander.js, axios. 3,598 commits. It was held out until the first
  version of the checks had been tuned on the first corpus. It then exposed five more false alarm shapes, which were fixed, so
  it is no longer held out either. A third corpus is the honest next measurement.

Reports per finding code, before and after the fixes:

| finding | tuned corpus, first draft | tuned corpus, final | second corpus, first run | second corpus, final |
|---|---:|---:|---:|---:|
| `diff-path-missing` | 251 | 9 | 18 | 10 |
| `diff-tests-missing` | 11 | 1 | 4 | 1 |
| `diff-docs-only-mismatch` | 1 | 0 | 0 | 0 |
| `diff-fix-docs-only` | 18 | 0 | 1 | 0 |
| `diff-symbol-direction` | 1 | 0 | 3 | 0 |
| `diff-breaking-export-removed` | 1 | 0 | 0 | 0 |

"First draft" is the checker at the start of this work plus the new checks as first written. Every report that went away was a
message that was right: dependency-bot URLs read as paths; a pull request template's comments and unchecked checklist;
"add support to test release candidates", "includes running tests" and "add tests ... to sdist"; type tests in `test-d/` and
`*-tests.ts`; a Rust test written in the source file; a comment typo in a test file; a squash that removes and re-adds one
name; "in a backwards compatible fashion" said about the future; "drop the waker" (Rust, not removal); a revert that describes the
commit it undoes; "the test I added in #7431"; "security fixes and bug patches"; bare "fix:" titles over documentation; and
Go import paths, relative paths and version ranges read as files.

What is left. `diff-path-missing`: `app.set/app.get`, `Pipfile/Pipfile.lock`, repository names such as `zeit/next.js`, partial
paths such as `fs/try_exists.rs`, and files that existed at that commit and are gone at head (the working tree is not the commit).
`diff-tests-missing`: a test edit inside a module that already held tests, which a line-level diff cannot see, and a squash message
that lists "Add failing test case" while the final change holds no test (httpx #1634), where the report is arguably right.

Recall of the checks that read direction. Take the real messages in both corpora that make an add or remove claim about a file or a
name and that the check confirms (79); reverse the verb; the check then reports 72 (91%). The seven it missed name something that
appears on both sides of the change. This is recall for claims the check can decide, on messages that were true to begin with; it
is not the share of false claims in the wild that the check catches.

How often an agent's commit makes a claim a diff can contradict is a different number and is not measured here. In the 112 commits
recorded for the haiku, sonnet and opus-core runs (`evals/results-claude-haiku-4-5-2026-10-20`, `evals/results-claude-sonnet-5-5-2026-10-20`, `evals/results-2026-10-17/core`; bare and skill arms; only the file names of each change are recorded) the checker finds no contradicted tests, documentation-only or file-count claim, except one file count in a sentence about how a future change goes, which is now ignored.
