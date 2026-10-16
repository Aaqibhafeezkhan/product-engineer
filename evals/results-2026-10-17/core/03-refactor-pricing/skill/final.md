Committed as `132ed4c`.

**What's there now**

- `src/rules.js` — the five rules, one object each: `{ id, description, multiplier, applies(context) }`. Adding a rule is appending an entry; removing one is deleting it.
- `src/pricing.js` — a four-line reduce over the list. It never needs editing when a rule changes. `price()` also takes an optional rule list as a fourth argument, so you can price against an alternative set without touching the file.
- `test/pricing.test.js` — each rule alone, the rules stacked, plus one test that drops a rule and one that adds a rule, which is where the isolation claim actually gets checked.
- `README.md` — the add/remove/change instructions, for whoever picks up the next marketing request.

**Evidence, not just green tests**

I ran the old function and the new one side by side over 43,920 input combinations — 6 base prices × 4 loyalty values (including an unknown tier and none at all) × 5 night counts × all 366 days of 2024. Zero differences. The script lives outside the repo at `/tmp/pricing-parity/parity.mjs` if you want to rerun it. `npm test`: 5 passing.

One property worth knowing, because it's what makes the list safe: every rule is a multiplier and rounding happens once at the end, so list order genuinely doesn't matter. If marketing ever asks for a flat-amount rule ("£15 off") or a cap, that stops being true and the engine will need an explicit ordering story.

**Not shipped:** a breakdown API showing which rules fired and what each one cost — useful for a support agent explaining a price to a guest, but you didn't ask for it and it's easy to add later against this shape. Rules also still require a deploy to change; moving them to config is the bigger version, worth it once non-engineers edit them directly.
