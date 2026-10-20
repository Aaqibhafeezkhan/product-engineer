Committed on branch `refactor-pricing-rules`.

## What changed

Pricing is now an **engine plus a list of rules** instead of one function:

- `src/pricing.js:8` — walks the rule list and multiplies. It contains no rule logic at all, so it never needs editing when marketing changes something.
- `src/rules/*.js` — one module per rule (`weekend-surcharge`, `loyalty-discount`, `summer-surcharge`, `long-stay-discount`). Each is a plain `{ name, multiplier(booking) }` object where `1` means "no effect".
- `src/rules/index.js` — the list of rules in effect. **This is the only file marketing changes touch:** add a rule = new module + one line; remove a rule = delete a line. I verified both by actually adding and removing one.

`price(base, date, guest)` is unchanged, so nothing calling it breaks.

## Why it's no longer scary

The 256-combination parity test in `test/pricing.test.js` prices every base/date/guest combination against the *old* implementation and gets bit-identical results — the restructuring provably moved no price. Because every rule is a multiplication, rules are genuinely independent: order doesn't affect the outcome, and one rule can't change another's behavior.

I also added `explain()`, which returns each rule's multiplier and running total, so a proposed change can be inspected before shipping. `price()` takes an optional rule list as a fourth argument, so a proposed rule set can be priced side by side with the live one.

Two judgment calls worth your attention:

- **Gold and silver became one rate table** in `loyalty-discount.js` rather than two separate rules. They're mutually exclusive, and a new tier like "platinum" is now one row. If you'd rather each tier be independently removable, say so and I'll split them.
- **The parity test duplicates the old all-in-one function** — the very shape we removed. It's a migration guard, commented as such: delete it when marketing's first real rule change lands rather than updating it to match, or it quietly becomes a second place where all the rules live.
