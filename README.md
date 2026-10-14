<p align="center"><img src="assets/wordmark.svg" width="520" alt="product-engineer"></p>

<p align="center"><a href="https://bubblegunn.github.io/product-engineer/">bubblegunn.github.io/product-engineer</a></p>
<p align="center">English | <a href="README.tr.md">Türkçe</a> | <a href="README.zh-CN.md">简体中文</a></p>

<p align="center"><em>Your agent ships code. product-engineer makes it ship outcomes.</em></p>

<p align="center">
  <img src="https://img.shields.io/github/stars/Bubblegunn/product-engineer?style=flat-square&color=111111" alt="stars">
  <img src="https://img.shields.io/badge/dependencies-0-111111?style=flat-square" alt="zero dependencies">
  <img src="https://img.shields.io/badge/skills-4-111111?style=flat-square" alt="four skills">
  <img src="https://img.shields.io/github/actions/workflow/status/Bubblegunn/product-engineer/ci.yml?style=flat-square&color=111111&label=ci" alt="ci">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT">
  <a href="https://doi.org/10.5281/zenodo.22395211"><img src="https://img.shields.io/badge/DOI-10.5281%2Fzenodo.22395211-111111?style=flat-square" alt="DOI"></a>
</p>

An agent skill that makes an AI coding agent think like a product engineer instead of a
code printer. Before building, it restates the work as a customer outcome. In every commit
and pull request, it writes a plain-language "For the customer" block. It refuses to call
unobserved work done, names what it deliberately did not build, and never prints a number
it did not count.

## See it

The same commit, before:

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

The agent's report, before:

```
Done. All 42 tests pass.
```

After:

```
Watched it in staging logs: 3 of 3 webhook retries logged, final failure recorded with the booking id.
Could not check: production, no deploy yet.
Not shipped:
- Dead-letter queue: three retries cover every failure in 90 days of logs.
```

The check, on a message without the block and then with it (the two fixtures are in
[`test/fixtures/`](test/fixtures/), so the picture can be reproduced from the command):

<img src="assets/check-demo.svg" width="760" alt="product-engineer check on a message without the block, then with it">

A longer pair, unedited, from the evaluation: [`docs/examples.md`](docs/examples.md).

One real defect in a public repository, fixed twice by the same model on the same commit,
with the skill and without, both commit messages quoted whole:
[`docs/case-study.md`](docs/case-study.md).

## Install

```
npx skills add Bubblegunn/product-engineer
```

That places the skills for the agents in your project (Claude Code, Codex, Cursor, Copilot,
Gemini CLI and the rest). Where each file lands, the Claude Code plugin commands, the git
hook and the CI action are in [`docs/install.md`](docs/install.md); Cursor as a rule file
rather than a skill is in [`docs/cursor.md`](docs/cursor.md).

The skills are text files and need nothing installed. The `product-engineer` command (`check`,
`doctor`, the pre-commit entry) needs Node 22 or newer; the commit-msg hook itself is POSIX sh.

## Measured

Eight small tasks, each run twice with Claude Code in headless mode: once bare, once with
this skill installed in the repository. One run each, so a smoke test, not a study. The
harness, the fixtures and every transcript are in [`evals/`](evals/), and
[`evals/RESULTS.md`](evals/RESULTS.md) explains the heuristics and what they miss.

| metric | bare | skill | delta |
|---|---|---|---|
| Commit carries the For-the-customer block | 0 / 8 | 8 / 8 | +8 |
| Final message reports an observation or says what it could not check | 1 / 8 | 7 / 8 | +6 |
| Final message names something deliberately not done | 2 / 8 | 7 / 8 | +5 |
| Every number in the final message has a method or scope next to it | 1 / 8 | 1 / 8 | +0 |
| Only the requested files changed (tests and documentation allowed) | 8 / 8 | 8 / 8 | +0 |

The evaluation installed the core skill and nothing else. `customer-block` and
`done-means-observed` carry the two rules whose metrics moved furthest in that run, but
neither extraction has been measured on its own, and `release-notes` has no task at all,
because none of the eight writes release notes. Each skill states its own gap.

Two rows did not move and are printed anyway: the number heuristic scores 1 of 8 in both
conditions, and every file change in both conditions stayed within the task once
documentation edits were allowed for. The heuristics were corrected on 5 September and the
transcripts rescored; [`evals/RESULTS.md`](evals/RESULTS.md) says what changed. The skill
runs took about 60% more turns and cost about 45% more, because they verified more and
wrote more.

## What the diff check costs

`--diff` fires only when it can prove a mismatch, so the question that matters is how often
it is wrong about a message somebody actually wrote. `npm run baseline` answers it on the
history of whatever repository you run it in: it mutates real commits so each message
contradicts its own diff, asks whether the checker notices, and writes
[`evals/baseline/RESULTS.md`](evals/baseline/RESULTS.md). CI reruns it on every push and fails
on a false alarm, on a reachable kind going uncaught, or on the unreachable kind being caught.

Run on this repository at `25dcce7`, 200 commits deep, 59 of them scored:

| measure | value |
|---|---:|
| false alarms on real messages | 0 |
| specificity | 100% |
| recall, the four kinds any check can reach | 100% |
| recall, `operation` | 0% |

The counts move as the history grows, which is why the run is named. Rerun it and you get
your own numbers, on your own repository.

That last row is in the corpus on purpose. No check reads operation verbs, so swapping
`added` for `removed` goes unnoticed, and a blind spot printed as a zero is one you can see.
Three kinds in the taxonomy this borrows from cannot be produced mechanically at all, because
they need someone to read what the code means; this reads a numstat.

Running it found three false alarms on real commits and all three are fixed, which is the
outcome the harness is for. It sits beside published numbers for models asked the same
question, and the design document explains why that is context rather than a comparison.

## The pack

| skill | what it is | install it when |
|---|---|---|
| [`product-engineer`](skills/product-engineer/SKILL.md) | the seven rules and the reference files | your agent writes code |
| [`customer-block`](skills/customer-block/SKILL.md) | rule 2 alone: the block, with two pairs | you only want the block in commits and pull requests |
| [`done-means-observed`](skills/done-means-observed/SKILL.md) | rule 3 alone: what was watched, what could not be checked | you only want honest completion reports |
| [`release-notes`](skills/release-notes/SKILL.md) | the rules for an agent that writes about software instead of writing it | release notes, changelogs, status updates |

The installer offers all four; pick what you need. Agents that read instruction files
rather than skills (Cursor rules, Copilot instructions, Gemini, Cline, Kiro, Windsurf) get
the same seven rules from files generated out of `SKILL.md`; see
[`docs/install.md`](docs/install.md).

## The seven rules

1. Restate before building. One sentence of customer outcome, or one question.
2. For the customer, every time. What changed, why it matters, automation effect only if real.
3. Done means observed. Logs, data or a real device, or say what you could not check.
4. Build what was asked; name what you did not. A `Not shipped:` list with reasons.
5. No number without a count. Every figure has a command behind it and a scope.
6. Speak the stakeholder's language. A jargon-to-plain table ships with the skill.
7. Smallest change that moves the metric. One ledger line before any design.

Full text: [`skills/product-engineer/SKILL.md`](skills/product-engineer/SKILL.md). The
template, the five questions, the done checklist, the plain-language table and the
not-shipped format are in [`references/`](skills/product-engineer/references/).

## Check a message or a pull request

`product-engineer check` reads a commit message or PR description and reports whether it
carries the block and whether the block reads the way the skill asks: `What changed`, `Why it
matters`, an `Automation effect` line that is either meaningful or absent, a well-formed
`Not shipped:` list, numbers without a method next to them, and jargon from the plain-language
table used without an explanation.

```
node bin/check.mjs check .git/COMMIT_EDITMSG     # or: product-engineer check <file|->
node bin/check.mjs check --pr 12                 # the body through the GitHub API, or gh outside Actions
node bin/check.mjs check --pr 12 --comment       # and one comment on the pull request, updated in place
```

### Does the message match the change?

Everything above reads the message alone, so it can tell whether you said the right shapes.
It cannot tell whether what you said is true, and in 2026 that is the gap that hurts: the
description reads clean, the change is large, and the reviewer has no way to know which
sentences were checked. `--diff` reads the change itself and reports where the two disagree.

```
node bin/check.mjs check .git/COMMIT_EDITMSG --diff        # the staged change
node bin/check.mjs check --pr 12 --diff main...HEAD        # a branch
```

Four disagreements are reported, each naming what was counted:

| the message says | and the change shows | reported |
|---|---|---|
| tests were added | no test file gains a line | a warning, with the file counts |
| documentation only | a source or test file changed | a warning, naming the files |
| a file count | a different number of files | a warning, with both numbers |
| a path | it is in neither the change nor the repository | a warning, naming the path |

The fourth is the one worth having. A path that exists but is untouched is ordinary context
and is never reported; a path that is in neither place is a reference to a file that was
renamed, or never existed, which is a shape agent-written messages leave behind.

A phrase inside backticks or quotation marks is being named, not asserted, so a message that
describes these checks does not trip them. That was the first thing the flag caught, on the
commit that added it.

Each check is conservative on purpose. A refactor claiming no behaviour change is not
checked against the source it touches, because that claim is usually true, and a number is
only read as a file count when its sentence also carries a verb of changing. Nothing here
reports an error, so a run that passed yesterday cannot fail today; without `--diff` the
output is byte-identical to before.

**The paths a message cites are checked against the working tree.** A message that says the fix is
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

Write the block in the language your team writes. English, Turkish, Japanese and Chinese
headings are accepted with no configuration, and a heading for any other language goes in
`.product-engineer.json`; the table and the format are in
[`skills/product-engineer/references/headings.md`](skills/product-engineer/references/headings.md),
and the commit-msg hook is generated from it so the two cannot disagree.

The block also gets a readability line, Flesch (1948) for English or Ateşman (1997) with
`--lang tr`, plus LIX (Björnsson, 1968), as information only. All three count syllables or
word lengths in the Latin alphabet, so for a block written in any other script the tool names
the script, says it is not scoring and why, and prints no number. Japanese, Chinese, Korean,
Arabic, Hebrew and Thai each get their own reason; Cyrillic, Greek and Devanagari are refused
because no calibration for them is implemented here, not because the language resists one; and
a script the tool cannot name is still refused. Before that, a block in Hindi, Tamil, Greek or
Amharic came back Flesch 0, graded hard, which is a number nobody counted. Exit 1 on a missing block, 0 with `--warn`. Run on this repository's own last five commits
it reports no errors and one warning (a sentence quoting the eval counts without a method
word next to it). `--format github` turns the findings into run annotations. As a CI step
(needs `pull-requests: write` for the comment, see [`docs/install.md`](docs/install.md)):

```yaml
      - uses: Bubblegunn/product-engineer@v0
        # with: { warn: "true" }   # report instead of failing
```

## What it does not do

It runs no process and owns no workflow; it composes with spec, TDD and review skills. It
does not write product strategy. It enforces nothing unless you install the hook.

## Where it comes from

These are the rules Efe Genc worked by for four years as a founding engineer on a
hospitality platform and as the sole author of a proactive assistant: a commit convention
that explains every change to a non-technical reader, a definition of done that means
watching the thing behave, and the habit of writing down what was deliberately not built
([The feature I chose not to ship](https://efe-genc-portfolio.vercel.app/writing/the-feature-i-chose-not-to-ship/)).

## Contributing

Rule changes need one before/after pair and one eval task; see
[CONTRIBUTING.md](CONTRIBUTING.md), which also describes the one-command release. The [roadmap](ROADMAP.md) is short on purpose.
Translations and per-stack jargon tables are labelled `good first issue`.

## Cite this

Every release is archived on Zenodo with a DOI, so a paper or a report can point at the
exact skill definition it ran.

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22395211.svg)](https://doi.org/10.5281/zenodo.22395211)

That is the **concept** DOI: it always resolves to the newest version. To cite the exact
version you ran, open that page, pick the version in the sidebar, and use the DOI shown
there. `CITATION.cff` in this repository carries the same identifier, so GitHub's "Cite this
repository" button produces correct BibTeX and APA without any copying by hand.

## Stars

<a href="https://star-history.com/#Bubblegunn/product-engineer&Date"><img src="https://api.star-history.com/svg?repos=Bubblegunn/product-engineer&type=Date" width="520" alt="Star history"></a>

MIT.
