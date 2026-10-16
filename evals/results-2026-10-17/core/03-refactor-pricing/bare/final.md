Done — committed on `refactor/pricing-rules` (I branched rather than committing to `main` directly; it's a fast-forward away from merging).

**The shape now:** each rule is its own file under `src/rules/`, exporting `{ name, multiplier(context) }` that returns a factor to apply to the running price, where `1` means "doesn't apply."

```js
// src/rules/weekend.js
export default {
  name: "weekend",
  multiplier({ date }) {
    const day = date.getUTCDay();
    return day === 5 || day === 6 ? 1.2 : 1;
  },
};
```

`src/rules/index.js:13` lists the active rules and is the only shared file. Adding a rule is one new file plus two lines there; removing one is deleting both. The key property is that rules can't see each other or the running total — they receive only `{ base, date, guest }` — so a new rule can be combined with the others but can't break them. `price()` keeps its exact signature.

**On "scary":** the point of the restructure is that changes are now verifiable, so I added `test/pricing.test.js` — it pins today's prices, exercises each rule alone, and asserts that dropping any one rule leaves the rest intact. Two things I checked rather than assumed:

- **Behavior is unchanged.** I compared the new code against the original across 72,000 combinations of date, tier, nights, and base rate: zero mismatches, bit-identical. I kept the multiplication in the original order so even floating-point results match.
- **The extension story actually works.** I temporarily added a sixth rule (a New Year's surcharge) the way the README describes. It touched only the new file and the registry, the existing tests passed untouched, and other dates were unaffected. Then I removed the probe.

Two things worth flagging:

- **One small behavior fix, not a pure refactor.** The loyalty table is now read with `Object.hasOwn` (`src/rules/loyalty.js:13`). A tier named `"constructor"` or `"toString"` would otherwise resolve up the prototype chain to a function and turn the price into `NaN`. Unreachable with your current tiers, but it's a trap sitting in the exact file marketing will edit most.
- **The multiplicative assumption is now explicit.** Every rule is a factor, so order doesn't affect the result. That holds for all five of today's rules, but the first request for a flat "$20 off" or a price cap won't fit this interface — that's the moment to extend it (likely an ordered pipeline of `apply(price, context)`), and the tests will tell you if it drifts.
