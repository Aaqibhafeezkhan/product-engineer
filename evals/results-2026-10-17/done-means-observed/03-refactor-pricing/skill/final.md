Committed on a new branch `refactor-pricing-rules` (you were on `main`, so I branched rather than committing there).

**What changed**

`src/rules.js` — the five rules as a plain list, one entry each:

```js
{ name: "weekend-surcharge", applies: ({ day }) => WEEKEND_DAYS.includes(day), factor: 1.2 }
```

`src/pricing.js` — `price()` now just multiplies the factors of the rules that fire and rounds. No rule knows about any other, so adding one is appending an entry and retiring one is deleting it. The thresholds that were bare numbers (`day === 5 || day === 6`, `month >= 5 && month <= 7`, `nights >= 7`) are now named constants.

`price()` takes an optional fourth argument to run against a different rule list — that's how the tests exercise add/remove, and it's also how you'd try a proposed rule before shipping it.

**On behaviour being unchanged:** `test/pricing.test.js` keeps the original function as an oracle and compares the two across every combination of 3 bases × 42 dates (every weekday in a non-peak, peak, and shoulder month) × 16 guest shapes — 2016 cases, all matching. Plus tests that a rule can be added and removed without disturbing the rest. `npm test`: 6 pass, 0 fail.

Two things to flag:

- I added `breakdown()`, which wasn't asked for. It returns which rules fired and the running price before/after each — it seemed like the thing you'd actually want when marketing asks why a night came out at a price. Easy to drop if you don't want the extra surface.
- Order in the list is now cosmetic, since the price is a product. That's true of the current rules and was true before. If marketing ever asks for something non-multiplicative — a price cap, "best discount only, don't stack" — that needs a change to the engine, not just a new entry. Worth knowing where the seam stops holding.

I ran the tests but did not run this against real booking data or any caller of `price()`; I didn't look for other call sites beyond this repo, which contains none.
