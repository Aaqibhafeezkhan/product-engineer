# Changelog

## 0.6.0 (2026-10-14)

**`product-engineer template` prints the block to fill in.** In English by default, in a shipped language
with `--lang tr|ja|zh`, or in the heading set from `.product-engineer.json`; an unknown `--lang` exits 2.
`product-engineer template > .gitmessage.txt` plus `git config commit.template .gitmessage.txt` makes git
open every commit with the block. `check` now reads a heading followed only by an unfilled
`<placeholder>` as empty, so a half-filled template fails: on 0.5.2 a leftover
`Automation effect: <…>` line passed with no errors, and now it is reported. A line that merely starts
with an angle bracket, such as `What changed: <video> embeds play again.`, still passes. Written by
[@Enard52](https://github.com/Enard52) ([#41](https://github.com/Bubblegunn/product-engineer/pull/41), closes
[#25](https://github.com/Bubblegunn/product-engineer/issues/25)).

## 0.5.2 (2026-10-14)

**A long run of `.`, `!` or `?` no longer stalls the check.** The sentence splitter in
`bin/readability.mjs` used `[.!?]+(\s|$)`, which retried a run of punctuation from every position
inside it. A block holding 40,000 exclamation marks between two letters took 2,051 ms to score, and
time grew with the square of the run, so a pull request body could hold the Action for as long as
its author liked. The split now happens at the whitespace after a punctuation mark: the same input
takes 0.3 ms. Readability results are byte-identical before and after on 101 texts (the test
fixtures, `examples/`, every commit message in this repository and eight punctuation edge cases).
`test/readability.test.mjs` fails if 50,000 exclamation marks take 250 ms or more; before the fix
they took 3,244 ms.

The release workflow's `smoke` job, which installs the published package on three operating
systems, no longer restores an npm cache: `package-manager-cache: false` on its `setup-node`, as the
`publish` job already had. A cache written by another workflow run could otherwise reach a job that
runs on a release tag. zizmor 1.30.1 reported it as `cache-poisoning` and reports nothing now.

Dependabot waits seven days after a release before proposing it, for both GitHub Actions and npm
(`cooldown.default-days: 7`), so a version that is pulled soon after publishing is less likely to
reach this repository.

## 0.5.1 (2026-10-14)

**The Action can be listed on GitHub Marketplace.** Marketplace accepts a description of fewer than 125 characters; this
one was 138. It is now 119, and a test fails on a description of 125 characters or more. Nothing a workflow uses changes.

## 0.5.0 (2026-10-14)

**Breaking: Node 22 or newer.** `engines.node` moves from `>=20` to `>=22`, because Node 20 reached
end of life on 2026-04-30 and receives no security fixes. The code did not change for it, and the
suite still passes on Node 20.20.2 today (106 tests, run once in `node:20`), but no workflow here has
ever run on Node 20, so nothing would notice when that stops being true. npm prints an engine
warning on Node 20 and installs anyway unless `engine-strict` is set. The skills themselves are text
and are not affected; the GitHub Action runs on whatever Node the runner provides.

**The version a file states is now checked everywhere the release sets it.** The package was 0.4.0
while `skills/product-engineer/SKILL.md` said 0.3.2, the other three skills said 0.3.0, and the
pre-commit snippet in `docs/install.md` pinned `rev: v0.3.0`, so a reader copying it installed the
hook as it was in 0.3.0. `product-engineer doctor` printed the 0.3.2 as the installed version. Nothing
failed, because neither `scripts/release.mjs` nor `scripts/release-gate.mjs` knew those files
existed. Both now read one list, `scripts/versioned-files.json`; the release sets every file on it
and the gate fails on any one that disagrees with `package.json`. A test changes each listed file in
a copy of the repository in turn and requires the gate to refuse it. `doctor` reports the package's
own version.

**`action.yml` has not been valid YAML since 0.3.0, and nothing ran it.** The `comment` input's
description said `pull-requests: write` without quotes, and YAML reads the second `: ` as a nested
mapping. PyYAML, `yaml@2` and actionlint (Go YAML) all refuse the file at line 17; GitHub's own
parser was not observed here, but a workflow using `Bubblegunn/product-engineer@v0` should expect the
same refusal until this ships. The description is quoted now. CI gains an `action` job that runs the
Action through `uses: ./` on a description with the block, one without, one without but with `warn`,
and a non-numeric `pr`, and requires each outcome; `test/action.test.mjs` runs the Action's shell step
with bash and pins the exit codes 0, 1 and 2, and fails on any unquoted value containing `: `.

New Action input `body-file`: check a file instead of fetching the pull request. Nothing is fetched
and no comment is posted. It exists so CI can run the Action on fixed text.

**The commit-msg hook refused a Chinese block when no UTF-8 locale was set.** The heading pattern
put the ASCII and fullwidth colons in one bracket, `[:：]`, and without a UTF-8 locale grep reads
`：` as three bytes, of which a bracket matches one. `给客户：` therefore failed under `LC_ALL=C` with
both BSD grep (macOS) and GNU grep (Debian). A Git Bash on Windows with no `LANG` set should behave
the same way; that was reasoned, not observed. The colon is an alternation now, `(:|：)`, and the hook test runs every case a second
time under `LC_ALL=C`.

CI runs the tests on Windows as well as Ubuntu and macOS, in Git Bash, which is the shell Git for
Windows runs the hook with. A new `.gitattributes` checks every text file out with LF on all
platforms, since Git for Windows converts to CRLF by default and the hook, the shell tests and the
version patterns match line ends.

## 0.4.0 (2026-09-21)

**A message can cite a file that is not there, and until now nothing noticed.** `check` resolves
every `path/to/file.ext` and GitHub Actions run URL in a message against the working tree. A missing
file, a directory where a file was claimed, or a line number past the end of a real file is a
warning; `--references error` makes it an error, `--references off` turns it off. A line number is
the part of a citation that rots while the sentence around it stays still, which is why it is checked
rather than trusted.

A message that cites nothing is reported as citing nothing, at info level, and passes in every mode.
That is the design rather than an omission: a check that required a link would be satisfied by a link
typed from memory, and the reader who followed it would be the one to find out. What is checkable is
the citation that is already there.

From outside the project: the request came from [@raju_dandigam](https://dev.to/raju_dandigam) in the
dev.to comments on the skill, who asked whether the observed evidence could be made machine-checkable
in CI, each claim linked to a test, a screenshot or a trace artifact, without turning the block into
boilerplate. The second half of his question is what shaped the default.

Offline by construction: a run URL is checked for shape, never fetched, and a test holds that with a
`fetch` that throws. Ten tests cover the rest, including the false positives that would make the
check ignorable (`v0.3.4`, `1.5x`, `e.g.`, `3/4`).

## 0.3.4 (2026-09-05)

The readability line refused six scripts and scored every other one. A customer block written in Hindi, Tamil, Greek, Amharic or Russian came back Flesch 0, band `hard`, LIX 0, which is a grade nobody counted and the opposite of rule 5. Hindi, Tamil and Greek were not even recognised as non-Latin: with no Latin letters present, `scriptOf` returned `Latin` and the English scale ran anyway.

Now only Latin script is scored. Every other script is named and refused with a reason: the six that were already listed keep the reason that describes the writing system, Cyrillic, Greek and Devanagari say that no calibration for them is implemented here rather than implying the language resists one, and a script outside the list is refused as "another script" instead of falling through. Sentence splitting counts any letter or digit rather than ASCII `\w`, so a Latin-script sentence written entirely in accented letters is no longer dropped before it is measured.

## 0.3.3 (2026-09-05)

`check --diff` now has a measured baseline. `npm run baseline` mutates the real commits of
whatever repository it runs in so each message contradicts its own diff, then asks whether the
checker notices, and writes `evals/baseline/RESULTS.md`. On this repository at 200 commits:
**specificity 100% over 59 real messages at `25dcce7`, with zero false alarms**, and recall 100% on the four
kinds of inconsistency any check can reach, 0% on the one deliberately included that none can.

Running it found three false alarms on real commits, all now fixed. A file count is only read as
a claim about the change when a change verb governs it: "a run left five files modified" describes
a previous run, and "Cursor users can drop one file into their project" borrowed its verb from the
`What changed:` heading while counting something a reader might do. A planning artefact that
describes tests is no longer read as a claim that tests were added, so "the design now has a plan
with the tests written out" stays quiet. And a claim phrase inside a longer hyphenated identifier
is a name rather than an assertion, so a message that mentions `extra-docs-only` is no longer read
as calling the change documentation only. The cost of the first fix is that the passive "five files
were changed" goes unchecked, which is a miss rather than a false alarm.

The design and its limits are in
`docs/superpowers/specs/2026-09-05-product-engineer-baseline-design.md`, including why the
CodeFuse-CommitEval dataset this was meant to run against could not be used: its data file is a Git
LFS pointer to an object that is not on the server.

## 0.3.2 (2026-09-05)

`check --diff` reads the change and reports where the message and the diff disagree: tests
claimed with no test file gaining a line, "documentation only" over a source change, a stated
file count the change contradicts, and a path named that is in neither the change nor the
repository. With no range it reads the staged change, which is what the commit-msg hook is
about to record. The flag is opt-in and every finding is a warning, so an existing run cannot
turn red on the upgrade and the output without it is byte-identical.

A phrase inside backticks or quotation marks is named rather than claimed, so a message that
describes these checks is not read as making them. Found by running the new flag on its own
commit, which is the first thing it caught.

The checks are deliberately narrow. A refactor claiming no behaviour change is not tested
against the source it touches; a number is read as a file count only when its sentence also
carries a verb of changing; and a named path that exists but is untouched is ordinary context,
so only a broken reference is reported.

## 0.3.1 (2026-09-05)

A skill joins the pack only when the eval measures it. Every skill in `skills/` now declares `metadata.measuredBy`, naming metrics that `evals/score.mjs` scores, and `test/skill-structure.sh` fails when a skill in the pack declares none or names a metric that does not exist. A skill without that mapping belongs in `skills/.experimental/`, which is documented rather than implied: `npx skills add` walks the repository to a depth of five and skips only `node_modules`, `.git`, `dist`, `build` and `__pycache__`, read from `skills@1.5.23`, so an experimental skill is still installed and the only marker that travels with it is its own description, which must open with `Experimental:`.

The gate also records what it cannot yet claim. `evals/run.sh` copies only `skills/product-engineer` into the work tree, so the other three skills are measured through the rules they share with it rather than on their own, and `release-notes` carries a `measuredGap` saying no task writes release notes at all. Naming that gap is the point of the declaration; a test that passed while the mapping was fiction would be worth nothing.

The customer block may be written in the language the team writes. `node bin/check.mjs check` on a message headed `Müşteri için:` reported `no "For the customer:" block` and exited 1, in a repository that ships plain-language tables in Turkish, Japanese and Chinese and therefore invites teams who do not write English. English, Turkish, Japanese and Chinese headings are now accepted with no configuration, a fullwidth colon reads as a colon, and `.product-engineer.json` names a heading for a language the table does not ship. The headings live in `skills/product-engineer/references/headings.md`, the commit-msg hook is generated from that table, and two tests fail if the table, the hook and the check drift apart.

The readability line refuses to score a script its formulas cannot read. A block written in Japanese returned `Flesch 0 (hard), LIX 0`, and so did Chinese, Korean, Arabic and Hebrew: a confident wrong number, on the languages whose plain-language tables this repository ships, from a skill whose fifth rule is that a number comes from a count. Flesch, Ateşman and LIX all count syllables or word lengths in an alphabet whose words are separated by spaces; for those scripts the check now says it is not scoring and why. English and Turkish output is unchanged.

A sentence ends at an ideographic full stop as well as a period, so the warning about a number without a method quotes one Japanese or Chinese sentence rather than the whole block, and counts them correctly. The Devanagari danda closes a sentence too. English splitting is unchanged, since none of those characters appear in it.

## 0.3.0 (2026-09-05)

- `references/from-the-diff.md`: derive the customer block from `git diff` rather than from memory of the request, including who the call path affects and what a reader would expect to be there and is not
- `check` warns when the customer block offers a passing test suite as its evidence and the message names no observation anywhere; describing tests that were added is not flagged
- Evals: the model is pinned, the requested model and the `claude --version` string are recorded in every `meta.json`, the runner prints the cost and does nothing without `--yes`, and a rerun writes to `evals/results-<timestamp>` instead of over the published evidence
- `node evals/score.mjs --failures` prints every failing cell with the evidence behind it; `RESULTS.md` publishes that list and a section on what eight tasks cannot prove
- `docs/case-study.md`: one real defect in a public repository, fixed twice by the same model on the same commit with the skill and without, both commit messages quoted whole, including where the two runs agreed and a cost pair that runs against the eight-task average
- `product-engineer doctor` lists the agents on this machine carrying the skill, in the project and in your home directory, and whether each copy still matches the packaged rules; it exits 1 when one is out of date
- `npm test` ran neither `test/release.test.mjs` nor `test/judge.test.mjs`; both run now, and `test/suite.test.mjs` fails when a test file is not named in the script

- A pack of four skills: `product-engineer` (the seven rules), `customer-block`,
  `done-means-observed` and `release-notes`, all placed by one `npx skills add`.
- Adapters generated from `SKILL.md` for Cursor, Copilot, Gemini, Cline, Kiro, Windsurf and
  `AGENTS.md`; CI refuses a commit where they differ.
- Rescored evaluation: the number heuristic ignores code, versions, issue numbers, years and
  hashes; documentation files count as documentation, not scope creep.
- README opens with the before/after and a demo of `check`; the install matrix moved to
  `docs/install.md`.
- `check` as integrations: a commitlint plugin and shareable config, a pre-commit hook, and
  lefthook and husky snippets.
- Eval harness v2: runs per arm, a seeded bootstrap interval on the mean per-task delta, a
  pairwise model judge that prints its cost before running, and the benchmark design.
- Reference files: press-release restatement, ship-show-ask, appetite, and a hansei line in
  the definition of done.
- Plain-language tables in Turkish, Japanese and Chinese.
- Readability of the customer block (Flesch or Ateşman, plus LIX) as an info line in `check`.
- Chinese README.
- `check --pr` reads the pull request through the GitHub API with the token Actions
  provides (gh stays the fallback), `--comment` leaves one comment on the pull request
  with the verdict and the block to paste, updated in place on later runs, and
  `--format github` turns errors and warnings into run annotations; the action uses all
  three, with `comment` and `token` inputs.
- The release command moves the `v0` tag to every release, so Actions pin
  `Bubblegunn/product-engineer@v0`; the README and the install page use it. The release workflow starts on full version tags only, so the moving tag cannot start a second publish.
- A Cursor rule file to copy, `examples/cursor/`, generated with the other adapters, and
  `docs/cursor.md` on the rule versus the skill.

## 0.1.0 (2026-09-05)

First release: the seven rules, five reference files, optional commit-msg hook, Claude Code plugin manifests, skills.sh layout.
