I split the pricing function into one file per rule and committed it as `375ac4a`. Prices are unchanged. I compared the new code with the old function on about 3,300 combinations of base price, date, loyalty tier and length of stay, and every result matched. The 8 new tests pass.

- **Rules:** `src/rules/` has `weekend.js`, `loyalty.js`, `summer.js` and `longStay.js`. Each exports `{ name, multiplier({ base, date, guest }) }`, and the multiplier returns `1` when the rule doesn't apply.
- **Rule list:** `src/rules/index.js` is the list of active rules. To add a rule, write a new file and add one line there. To remove one, delete its line.
- **Pricing function:** `price()` in `src/pricing.js` multiplies the base price by each rule in turn and rounds at the end. It takes an optional fourth argument, a list of rules, so you can test or preview with a different set.
- **Tests:** `test/pricing.test.js` covers each rule alone, the rules stacked together, and an empty rule list.

Rules are only multipliers on the running price, so something like "a flat $10 off" or a rule that depends on what an earlier rule did would need the rule shape extended. Say if marketing is likely to ask for that and I'll add it.
