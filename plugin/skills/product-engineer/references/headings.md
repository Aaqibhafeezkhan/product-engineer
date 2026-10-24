# Block headings, by language

The check, the commit-msg hook and this skill all read this table, so the three cannot
disagree about what the block looks like. `scripts/generate-adapters.mjs` writes the hook
from the rows below, and CI fails when the hook and the table drift apart.

English is the default: it is what the skill tells an agent to write and what the paste
template offers. A block written with any row below is accepted with no configuration,
because a team that writes its commits in Turkish should not have to write this one
heading in English.

A colon may be written fullwidth (`：`); the check reads both.

| language | block | what | why | automation | not shipped |
|---|---|---|---|---|---|
| en | For the customer: | What changed: | Why it matters: | Automation effect: | Not shipped: |
| tr | Müşteri için: | Ne değişti: | Neden önemli: | Otomasyon etkisi: | Yapılmayanlar: |
| ja | お客さまへ: | 変わったこと: | なぜ重要か: | 自動化の効果: | 今回やらないこと: |
| zh | 给客户: | 改动内容: | 为什么重要: | 自动化影响: | 本次未做: |

These four are the languages whose plain-language tables ship in this directory.

## A language that is not here

Put the team's own headings in `.product-engineer.json` at the root of the repository:

```json
{
  "headings": {
    "block": "Für den Kunden:",
    "what": "Was sich geändert hat:",
    "why": "Warum es wichtig ist:",
    "automation": "Automatisierungseffekt:",
    "notShipped": "Nicht geliefert:"
  }
}
```

`{ "language": "tr" }` selects a row above instead, which changes the heading the check
names when the block is missing and the heading the pasted template offers. Either way the
shipped rows stay accepted, so a repository with contributors writing in two languages does
not have to choose.

## What is still English only

The warnings that read the prose inside the block are English heuristics: the one that
notices a passing test suite offered as evidence, the one that asks for a method beside a
number, and the one that spots jargon from the plain-language table. In another language
they stay quiet rather than guessing. A missing block is still an error in every language;
the rest is advice this tool can only give in English today.
