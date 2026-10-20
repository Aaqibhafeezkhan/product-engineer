I split the pricing function into one file per rule and committed it (`16ff68b`). Prices come out exactly as before.

- **Rules:** Each rule is a small file in `src/rules/`: `weekend.js`, `loyalty.js`, `summer.js` and `longStay.js`. A rule has a `name` and a `multiplier({date, guest})` that returns `1` when it doesn't apply.
- **Registry:** `src/rules/index.js` lists the active rules in order. To add a rule, write its file and add one line there. To remove one, delete that line.
- **`price()`:** It now just multiplies the base price by each rule's multiplier and rounds at the end. It also takes an optional `rules` argument, so a test can try a single rule on its own.
- **Order:** I kept the original order (weekend, loyalty, summer, long stay) so rounding can't drift.
- **Checks:** I compared old and new output on 24 date, loyalty and nights combinations, and they were identical. I also added `test/pricing.test.js`, which covers each rule, all of them combined, and rules used in isolation. `npm test` passes.
