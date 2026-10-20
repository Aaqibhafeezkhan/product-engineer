# Listing text for each store

Copy-ready text for each store this repository appears in. Submitting it is a separate step done by the maintainer. One category sentence is used everywhere:

> product-engineer is an agent skill and command-line checker that makes AI coding agents explain each commit and pull request in plain language, and warns when the message contradicts the diff.

## npm

Package: `product-engineer`. The description is the category sentence (it is the `description` in `package.json`; nothing to submit, it ships with the next release).

Keywords: agent-skills, skills, claude-code, claude-code-skill, codex, cursor, copilot, gemini-cli, ai-agents, ai-coding-agent, commit-message, commit-message-lint, pull-request, pull-request-description, commitlint, commitlintplugin, github-action, pre-commit, git-hooks, diff-check, product-engineering, plain-language, non-technical-stakeholders, release-notes

Search phrases the keywords and README cover: "claude code skill commit message", "commitlint plugin", "lint pull request description", "plain language pull request description", "explain code changes to non-technical stakeholders", "AI agent says done but did not test".

## GitHub Marketplace (Action)

Name: product-engineer check

Description (125 characters or fewer): Checks that a pull request has a plain-language "For the customer" block and warns when it contradicts the diff,.

Notes: the current `action.yml` description is `Fails a pull request whose description has no "For the customer" block, and says so in one comment on the pull request.` The text above also mentions the diff, which needs the `diff` input added in 0.7.0, so change `action.yml` only in the release commit for 0.7.0 (`test/action.test.mjs` checks the 125 character limit). Primary category: Code quality. Secondary: Continuous integration. Icon `check-square`, colour `blue` (already in `action.yml`).

## skills.sh

Listing is read from the repository by `npx skills add Bubblegunn/product-engineer`; there is no form. The four skills are listed by their `description` front matter. Suggested one-line descriptions for the search results, to be applied to the `SKILL.md` files only in a change that also regenerates the adapters (`node scripts/generate-adapters.mjs`):

- product-engineer: Makes a coding agent restate work as a customer outcome, write a plain-language "For the customer" block in every commit and pull request, report what it observed, and name what it did not build.
- customer-block: Adds a plain-language "For the customer" block to every commit and pull request an agent writes.
- done-means-observed: Makes a coding agent say what it observed and what it could not check before it says a task is done.
- release-notes: Rules for an agent that writes release notes, changelogs and status updates for non-technical readers.

## Claude Code plugin directory

Name: product-engineer. Category: engineering. Description: Makes a coding agent write a plain-language "For the customer" block in every commit and pull request, report what it observed, and name what it did not build. Four skills in one plugin. The plugin name cannot be changed after submission (research report 8), so confirm `product-engineer` before submitting. Keywords: product, commits, pull-requests, plain-language, definition-of-done (from `.claude-plugin/marketplace.json`).

## Codex and Cursor plugin directories

Display name: product-engineer. Short description: Plain-language customer block in every commit, and done means observed. These are the values already in `.codex-plugin/plugin.json`. Do not submit either until the plugin has been installed in the real app and one commit made afterwards carries the block; Phase 1 verified the file shape and the skills they load, not the install. The Codex manifest privacy and terms URLs point at GitHub's general pages and need Efe's confirmation.

## Stores that do not apply

VS Code Marketplace: there is no extension. MCP registries: there is no MCP server. PyPI: the package is npm only.
