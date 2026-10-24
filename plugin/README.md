# product-engineer, Claude Code plugin

This folder is the Claude Code plugin of [product-engineer](https://github.com/Bubblegunn/product-engineer). It holds four skills and nothing else. The `product-engineer` command line tool, the benchmark evidence and the tests live in the rest of the repository and are not part of the plugin.

Install:

```
/plugin marketplace add Bubblegunn/product-engineer
/plugin install product-engineer@bubblegunn
```

## What the plugin contains

- `skills/product-engineer`: the seven rules (customer outcome first, a plain-language "For the customer" block in every commit and pull request, done means observed, name what you did not ship, no number without a count), with reference files.
- `skills/customer-block`, `skills/done-means-observed`, `skills/release-notes`: subsets of the same rules, for people who want only one part.

The skills are text. They may tell the agent to run `git`, and they mention `npx product-engineer check` as an optional command that checks a commit message; the agent runs it only in your project, and the command downloads the package from npm the first time. The plugin has no hooks, no MCP server and no scripts. It sends no data anywhere and changes no permission setting.

The files under `skills/` here are generated copies of the repository's top-level `skills/` folder (`node scripts/generate-adapters.mjs`); a test fails when they differ.

## Licence

MIT, see `LICENSE`.
