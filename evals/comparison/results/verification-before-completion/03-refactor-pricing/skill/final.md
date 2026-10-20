Done and committed as `493bd8f`.

**What changed**

`price()` was four stacked `if`s mutating one `p`. Now there's a small engine and one file per rule:

```
src/pricing.js          engine: build context → fold multipliers → round once
src/rules/index.js      the registry (the one list you edit)
src/rules/weekend.js    Fri/Sat        × 1.2
src/rules/loyalty.js    gold/silver    × 0.9 / 0.95
src/rules/high-season.js  Jun–Aug      × 1.3
src/rules/long-stay.js  7+ nights      × 0.85
```

Each rule exports `{ name, multiplier(ctx) }` and returns `1` when it doesn't apply. Rules read a shared context (`base`, `date`, `day`, `month`, `guest`) and never touch the price or each other — so adding or removing one is a new file plus one line in `src/rules/index.js`, and because multiplication is order-independent the list order can't change a price either.

**Verification** — I captured the original function's output from git before touching it and diffed: identical on all 900 combinations of base/date/loyalty/nights, including month and nights boundaries. `npm test` is 9/9 (each rule tested in isolation, plus stacking, rounding, and a test that drops the weekend rule and gets the base rate back).

**Two things worth knowing**

- I also added `explain(base, date, guest)`, which returns just the rules that moved a price with their multipliers. When marketing asks "why is this night $238.68?" you get the answer without reading code.
- The rule contract is deliberately *a multiplier*, which is what all four current rules are. If marketing asks for something that isn't — a flat cleaning fee, a price floor, a cap — that won't drop in as a file; it needs the engine extended. I didn't build a general transform pipeline for that speculatively, since the multiplier contract is exactly what makes rules order-independent and safe to delete. Say the word if you'd rather pay that generality cost now.
