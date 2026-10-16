Committed as `581a21e`.

**What changed**

`src/pricing.js` was one function with five rules written into it in sequence. Now:

- **`src/rules.js`** — each rule is one self-contained entry: `id`, a plain-language `label`, an `applies({ base, date, guest })` predicate, and a `multiplier`. Adding a rule is appending an entry; removing one is deleting an entry.
- **`src/pricing.js`** — `price()` reduces over the list and knows nothing about the individual rules. Rounding still happens once, at the end. I also added `priceBreakdown()`, which returns the same total plus the rules that fired — useful when marketing asks why a given night costs what it does.
- **`test/pricing.test.js`** — 17 tests, mostly a table of known prices including the high-season boundary (Aug 31 vs Sep 1) and the all-rules-at-once case.
- **`README.md`** — how to add, remove, or change a rule.

**Prices are unchanged.** I captured the original output across 35 date/guest combinations before touching anything and diffed it after: byte-identical.

Two things worth flagging:

- I kept `loyalty-gold` and `loyalty-silver` as two separate rules rather than collapsing them into a tier table. They're mutually exclusive in practice, but separate entries mean marketing can change or drop one tier without touching the other — which is what you asked for. If tiers start multiplying, a single rule reading a rate table is the better shape.
- `multiplier` is a plain number, so every rule is currently "multiply by a constant when it applies." A rule like "£20 off" or "cap at £300" won't fit without changing the shape. I didn't build for that since nothing in the current set needs it; when marketing first asks for one, that's the moment to widen it.
