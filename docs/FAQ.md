# product-engineer: questions and answers

product-engineer is an agent skill and command-line checker that makes AI coding agents explain each commit and pull request in plain language, and warns when the message contradicts the diff.

## What does product-engineer do?

It has two parts. The skill is four skills, each a SKILL.md with the main one also carrying reference files, that tell a coding agent to write a plain-language "For the customer" block in every commit and pull request, say what it observed and what it could not check, and name what it deliberately did not build. The checker is a command, `product-engineer check`, that reads a commit message or pull request description and reports whether the block is there and whether it reads the way the skill asks. The checker needs Node 22 or newer and has no dependencies.

## How do I find out that my AI agent's commit message claims tests that it did not add?

Run `npx product-engineer check msg.txt --diff`, where `msg.txt` holds the message and the change is what you staged with `git add`. If the message says tests were added and no test file gains a line, it prints a warning with the file counts. Without a file name it reads `.git/COMMIT_EDITMSG`. For a pull request: `npx product-engineer check --pr 12 --diff main...HEAD`, which needs `gh`.

## Which mismatches does `check --diff` catch?

Four: the message says tests were added and no test file gains a line; the message says documentation only and a source or test file changed; the message states a file count and the number is different; the message names a path that is in neither the change nor the repository. It cannot read operation verbs, so "added" against "removed" goes unnoticed. That blind spot is printed as a 0% recall row in [`evals/baseline/RESULTS.md`](../evals/baseline/RESULTS.md).

## Does `check --diff` block a commit or fail a build?

No. It reports warnings and exits 0. A missing "For the customer" block is an error and exits 1, or exits 0 with `--warn`. The git hook (`sh scripts/install-hook.sh`) and the GitHub Action are the parts that enforce anything.

## How often does `check --diff` raise a false alarm?

On this repository's own history at commit `25dcce7` it scored 59 real commit messages and raised 0 false alarms. Run `npm run baseline` to get the number for your own repository. The method and the single blind spot are in [`evals/baseline/RESULTS.md`](../evals/baseline/RESULTS.md).

## How do I make my AI coding agent write commit messages a non-technical person can read?

Install the skill with `npx skills add Bubblegunn/product-engineer`. It asks the agent to add a block with `What changed:` and `Why it matters:` in plain words, and an `Automation effect:` line only when a manual step disappeared. `product-engineer template > .gitmessage.txt` plus `git config commit.template .gitmessage.txt` makes git open every commit with the block.

## Does the skill work on every model?

No. It was run on the same eight tasks, bare and with the skill, on three models. Commits carrying the block:

- claude-opus-5: 0 / 8 without the skill, 8 / 8 with it (one run per task, no interval computed).
- claude-sonnet-5-5: 0 / 24 without the skill, 13 / 24 with it (read as "worked").
- claude-haiku-4-5: 0 / 24 without the skill, 0 / 24 with it (all five measures read "no clear effect").

The tables, the costs and every transcript are in [`evals/RESULTS-models.md`](../evals/RESULTS-models.md). The measures are regular expressions over the agent's own words; [`evals/RESULTS.md`](../evals/RESULTS.md) lists what they miss.

## Does the skill make the agent slower or more expensive?

On claude-opus-5 the mean cost per run was $0.45 without the skill and $0.63 with it. On claude-haiku-4-5 it was $0.06 and $0.05, and on claude-sonnet-5-5 $0.09 and $0.10 (values from [`evals/RESULTS-models.md`](../evals/RESULTS-models.md)).

## How is product-engineer different from commitlint?

commitlint checks the Conventional Commits shape of a message. product-engineer checks that a plain-language section exists and reads well, and compares the message with the change. They run together; product-engineer ships a commitlint plugin. See [product-engineer vs commitlint](vs-commitlint.md).

## How is product-engineer different from the superpowers verification-before-completion skill?

That skill asks an agent to show fresh evidence before it claims work is done. product-engineer's `done-means-observed` rule asks for the same and adds the customer block, a list of what was not built, and a rule against numbers with no count behind them. See [product-engineer vs verification-before-completion](vs-verification-before-completion.md).

## Can it write a customer-facing changelog from my commits?

Not as a command. The `release-notes` skill gives an agent rules for writing release notes, but no eight-task measurement covers it, and the comparison with the `changelog-generator` skill does not measure changelog quality. See [product-engineer vs changelog-generator](vs-changelog-generator.md).

## Which agents does it work with?

The skills install through the skills.sh installer (`npx skills add Bubblegunn/product-engineer`) for Claude Code, Codex, Cursor, Copilot, Gemini CLI and the other agents that installer supports. There is a Claude Code plugin manifest. Codex and Cursor plugin manifests exist, and installing through each app's plugin search has not been verified yet. Cursor, Copilot, Gemini, Cline, Kiro and Windsurf also get the rules as generated instruction files; see [`install.md`](install.md).

## Does it send my code or messages anywhere?

`check` makes no network request unless you pass `--pr`, which reads the pull request through the GitHub API or `gh`. It runs no model. Only the evaluation scripts in `evals/` call a model, and only when you run them.

## How do I check pull request descriptions in CI?

Add `uses: Bubblegunn/product-engineer@v0` to a workflow that runs on pull requests. It fails a pull request whose description has no "For the customer" block and posts one comment. The `warn` input reports instead of failing. Setup and permissions: [`install.md`](install.md).

## What does it not do?

It runs no process and owns no workflow. It does not write product strategy, and it enforces nothing unless you install the hook or the Action. Its checks are conservative: a refactor that claims no behaviour change is not checked against the source it touches.
