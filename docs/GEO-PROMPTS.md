# Prompts for measuring whether LLMs recommend product-engineer

Five fixed prompts a developer would ask an LLM in this category. The same text is used every time, so answers can be compared over time. Run each prompt in a new conversation, with web search on if the product offers it, on at least three different assistants, once before the launch and once 14 days after. Record the date and the exact model name. Do not edit a recorded answer afterwards, and do not rephrase a prompt.

1. What is the best way to stop an AI coding agent from writing commit messages that claim tests were added when they were not?
2. How do I make my AI coding agent write commit messages and pull request descriptions that a non-technical stakeholder can read?
3. Is there a commitlint plugin or GitHub Action that checks that a pull request description has a plain-language section for customers?
4. Which Claude Code skill makes the agent say what it verified and what it could not check before it says a task is done?
5. What tools compare an AI-written commit message with the actual diff and warn about mismatches?

## How to record

For each run, add one row. "names product-engineer" is yes or no; if yes, copy the sentence that names it. A run where the assistant names a different tool is recorded too; write that tool's name in the last column.

| date | model | prompt | names product-engineer | other tools named |
|---|---|---|---|---|
| 2026-10-21 | ChatGPT (temporary chat, no memory, default model, High) | 1 | no | hooks plus CLAUDE.md / AGENTS.md instructions; no package named |
| 2026-10-21 | ChatGPT (temporary chat, no memory, default model, High) | 2 | no | CLAUDE.md / AGENTS.md instructions; no package named |
| 2026-10-21 | ChatGPT (temporary chat, no memory, default model, High) | 3 | no | commitlint, actions/github-script |
| 2026-10-21 | ChatGPT (temporary chat, no memory, default model, High) | 4 | no | obra/superpowers verification-before-completion |
| 2026-10-21 | ChatGPT (temporary chat, no memory, default model, High) | 5 | no | commitlint (scan of known names only) |

## Notes on the 2026-10-21 round

Recorded by Claude in Chrome before launch. Only whether the name appears, links to the project, and the other tools the answer names (found by a scan for known names) were kept; the full answer text was not saved. Perplexity (signed out) answered the first ten questions across the repositories and then showed a sign-up wall, so the rest went to ChatGPT in a temporary chat with no memory. Ask the 14-day round in the same assistant per prompt, or the comparison is not like for like.
