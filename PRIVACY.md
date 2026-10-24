# Privacy

Last reviewed: 2026-10-24, for product-engineer 0.7.0.

product-engineer does not collect, store or send your data to its author or to any third party. It has no account, no telemetry and no analytics.

## The Claude Code plugin

- The plugin holds four skills, which are text. It has no hooks, no MCP server and no scripts, and it changes no permission setting.
- The skills may tell the agent to run `git` in your project and to run `npx product-engineer check <file>` on a commit message. The agent runs these in your project, under your permission settings.

## The command line tool

- `check`, `diff`, `score` and the other commands read the files, standard input or git history that you point them at, and work locally. They send no text anywhere.
- `doctor` reads the agent skill folders in your project and in your home directory to compare them with the packaged skills. It reports on screen and changes nothing.
- `check --pr <n>` fetches a pull request description: through the GitHub API when `GITHUB_TOKEN` or `GH_TOKEN` and `GITHUB_REPOSITORY` are set, otherwise through the `gh` CLI. `check --comment` posts or updates one comment on that pull request through the same API. Both use your own token and talk only to GitHub (or the `GITHUB_API_URL` you set).

## What does touch the network

- `npx product-engineer` downloads the package from the npm registry the first time, under npm's own privacy terms. After that the tool runs offline except for the GitHub calls above.

## Contact

Questions: https://github.com/Bubblegunn/product-engineer/issues
