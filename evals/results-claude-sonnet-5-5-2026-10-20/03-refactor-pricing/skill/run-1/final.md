I split the pricing function into one file per rule, and it's committed. The prices it produces are unchanged. The new test passes; I didn't run it against anything outside the repo.

- **Rules:** Weekend, loyalty, summer and long-stay each have their own file in `src/rules/`. A rule exports `{ name, factor(ctx) }`, and `factor` returns the multiplier (1 means it doesn't apply).
- **Adding or removing:** To add a rule, create a file and add one line to `src/rules/index.js`. To remove one, delete its line and file. The other rules aren't touched.
- **`price()`:** It now multiplies the rule factors together and rounds once at the end. It also accepts an optional list of rules, which makes it easy to test a single rule on its own. The README has a short how-to.
- **Check against the old code:** `test/pricing.test.js` compares the new code with a copy of the old function across 336 combinations of date, loyalty tier, stay length and base price. All matched.

I didn't add rule ordering or priorities, or any way to configure rules from outside the code. Because every rule is a multiplier, the order doesn't change the price.
