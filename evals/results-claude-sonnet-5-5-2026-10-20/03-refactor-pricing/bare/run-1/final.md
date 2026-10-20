I split the pricing function into one file per rule, and the change is committed as `c356cd8`. A new test checks the output against a copy of the old function for a year of dates and several guest types, and it passes.

- **Rule files:** `src/rules/` has `weekend.js`, `loyalty.js`, `summer.js` and `long-stay.js`. Each one exports a `name` and a `multiplier(date, guest)` that returns `1` when the rule doesn't apply.
- **Adding or removing a rule:** add or delete the rule's file, then add or remove its line in `src/rules/index.js`. Neither change touches the other rules.
- **Combining rules:** `price()` in `src/pricing.js` multiplies the base price by every rule's multiplier and rounds once at the end. All the current rules are plain multipliers, so their order doesn't change the result.
- **Extras you didn't ask for:** `price()` takes an optional fourth argument for a custom rule list, which makes rules easy to test in isolation. I also added a short "Adding or removing a rule" section to the README.

Because every rule is a multiplier, a future rule that isn't one (a flat fee, or a cap on the total) would need a small change to how `price()` combines them.
