# Install

## With skills.sh

```
npx skills add Bubblegunn/product-engineer
```

That is the [skills.sh](https://skills.sh) installer. It detects the agents in the current
project and places every skill in this repository for each of them; `--all` targets every
supported agent, `-g` installs for your user instead of the project, and the interactive
prompt lets you pick a subset.

## Where it lands

| agent | path after `npx skills add` |
|---|---|
| Claude Code | `.claude/skills/<skill>/` |
| Codex, Cursor, Copilot, Gemini CLI and other agents that read the shared skills directory | `.agents/skills/<skill>/` |
| Windsurf, Roo, Kiro, Trae, Qwen Code, CodeBuddy, Goose and others with their own directory | `.<agent>/skills/<skill>/` |

Verified on 5 September 2026 with `npx skills add Bubblegunn/product-engineer --all --copy`
in an empty repository: four skills found, placed for 56 agent directories.

## The pack

| skill | install it when |
|---|---|
| `product-engineer` | your agent writes code and you want all seven rules |
| `customer-block` | you only want the "For the customer" block in commits and pull requests |
| `done-means-observed` | you only want honest completion reports: what was watched, what could not be checked |
| `release-notes` | the agent writes release notes, changelogs or status updates rather than code |

## Agents that read instruction files instead

The repository also carries the seven rules as generated files for agents that never open
a skills folder: `.cursor/rules/product-engineer.mdc`, `.github/copilot-instructions.md`,
`GEMINI.md` with `gemini-extension.json`, `.clinerules/`, `.kiro/steering/`,
`.windsurf/rules/` and `AGENTS.md`. Copy the one your agent reads into your project. They
are generated from `skills/product-engineer/SKILL.md` by `scripts/generate-adapters.mjs`
and CI refuses a commit where they differ.

| agent | copy this file | notes |
|---|---|---|
| Cursor | [`examples/cursor/.cursor/rules/product-engineer.mdc`](../examples/cursor/.cursor/rules/product-engineer.mdc) | `alwaysApply: true`; see [`cursor.md`](cursor.md) for the globs variant |
| Copilot | `.github/copilot-instructions.md` | |
| Gemini CLI | `GEMINI.md` with `gemini-extension.json` | |
| Cline | `.clinerules/product-engineer.md` | |
| Kiro | `.kiro/steering/product-engineer.md` | `inclusion: always` |
| Windsurf | `.windsurf/rules/product-engineer.md` | `trigger: always_on` |
| Codex and others | `AGENTS.md` | |

## Claude Code plugin

```
/plugin marketplace add Bubblegunn/product-engineer
/plugin install product-engineer@bubblegunn
```

Both commands were run and verified; `claude plugin validate .` and `claude plugin validate plugin --strict` pass. The plugin lives in `plugin/`; its `skills/` are generated copies of the top-level `skills/` (`node scripts/generate-adapters.mjs`).

## Codex and Cursor plugin manifests

The repository carries `.codex-plugin/plugin.json` and `.cursor-plugin/plugin.json`. Each points at `./skills/`, in the layout other plugins for those apps use, and `npm test` checks their shape and that all four skills load from them. Installing through each app's plugin search has not been verified yet ([#32](https://github.com/Bubblegunn/product-engineer/issues/32)); until it is, the install this page already describes, `npx skills add Bubblegunn/product-engineer`, is the one that has been run.

## By hand

Copy `skills/<skill>/` into `.claude/skills/`, `.agents/skills/`, or your agent's skills
directory.

## Git hook

For a checkout of this repository, `sh scripts/install-hook.sh` copies `scripts/commit-msg`
into `.git/hooks/`. npm users can install the same generated hook with:

```sh
npx product-engineer hook install
```

Add `--prefill` to also install a `prepare-commit-msg` hook that appends the customer-facing
block to ordinary new commit messages:

```sh
npx product-engineer hook install --prefill
```

The installer refuses to replace an existing hook unless `--force` is supplied, and
`hook uninstall` removes only hooks carrying its generated marker. A commit without the
block is refused with a two-line explanation. Merge, fixup, squash and revert commits pass,
and `[no-customer]` anywhere in the message opts one commit out.

## Commit template

Use `product-engineer template` to set up a git commit template for your repository or editor:

```sh
npx product-engineer template > .gitmessage.txt
git config commit.template .gitmessage.txt
```

To output another language from `skills/product-engineer/references/headings.md`, pass `--lang`:

```sh
npx product-engineer template --lang tr > .gitmessage.txt
```

A heading set configured in `.product-engineer.json` is also honoured automatically without `--lang`.

## CI

```yaml
name: customer block
on: [pull_request]
permissions:
  contents: read
  pull-requests: write   # for the comment; drop it and set comment: "false" to keep the log as the only report
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: Bubblegunn/product-engineer@v0
        # with: { warn: "true" }      # report instead of failing
        # with: { comment: "false" }  # no pull request comment
```

The action fails the pull request when its description has no "For the customer" block,
annotates the run with the other findings, and leaves one comment on the pull request: the
verdict, the findings, and the block to paste when it is missing. The comment is updated in
place on every push, never duplicated. A pull request from a fork runs with a read-only
token, so there the comment becomes a warning in the log and the check still runs.

Inputs: `pr` (defaults to the event's pull request), `warn`, `comment`, `token`, and `body-file` (check a file instead of fetching the pull request; nothing is fetched or posted, which is how this repository's CI runs the Action on fixed text).

Three more inputs:

- `diff` is a git revision range such as `origin/${{ github.base_ref }}...HEAD`. It turns on `check --diff`, which also reads the change and warns where the message and the change disagree. The checkout step needs `fetch-depth: 0` so the range can be read. Only plain revision text is accepted; a value that starts with `-` or holds spaces or shell characters fails the step with exit 2.
- `references` is `off`, `warn` or `error` and sets `check --references`. Empty keeps the default, `warn`.
- `skip-authors` is a comma-separated list of logins, `dependabot[bot],renovate[bot]` by default. A pull request opened by one of them is not checked, and the step prints one notice line saying why. An empty string checks every pull request. (`author` overrides the login the step compares; it exists so this repository's CI can test the skip on a push event.)

```yaml
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: Bubblegunn/product-engineer@v0
        with:
          diff: origin/${{ github.base_ref }}...HEAD
          references: error
```

## pre-commit

`.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/Bubblegunn/product-engineer
    rev: v0.8.0
    hooks:
      - id: product-engineer-check
```

Then `pre-commit install --hook-type commit-msg`.

## lefthook

`lefthook.yml`:

```yaml
commit-msg:
  commands:
    customer-block:
      run: npx product-engineer check {1}
```

## husky

`.husky/commit-msg`:

```sh
npx product-engineer check "$1"
```

## commitlint

`commitlint.config.mjs`:

```js
export { default } from "product-engineer/commitlint";
```

One rule, `customer-block`, as an error. To add it to a config you already have, see
[`integrations/commitlint/`](../integrations/commitlint/README.md).

## Checking what is installed

```
npx product-engineer doctor
```

It looks in this project and in your home directory for the places the surveyed agents
keep their copy, and reports each one as current or out of date by comparing its rules
against the packaged `SKILL.md`. Agents keep their own copies, so a project updated months
ago keeps running the rules it was given. The command exits 1 when a copy is out of date,
which is enough for a scheduled job to notice.
