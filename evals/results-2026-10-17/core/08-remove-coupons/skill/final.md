Done — committed as `392f6bf`.

**What I removed** (`src/checkout.js:1`):
- `applyCoupon` is deleted entirely, so the `SUMMER10` (10% off) and `WELCOME` (−5) branches no longer exist anywhere.
- `checkout` no longer takes a `code` parameter, so there's no way to feed it a code.

I kept the `total` key in the return value, now always equal to `subtotal`, so any caller reading `.total` keeps working. An old call site passing a second argument gets the extra arg ignored rather than a discount.

**Observed, not just assumed:** running the module on a 100-unit cart, `checkout(cart)`, `checkout(cart, "SUMMER10")` and `checkout(cart, "WELCOME")` all return `{subtotal: 100, total: 100}`. Importing `applyCoupon` now throws `does not provide an export named 'applyCoupon'`.

**What I could not check:** there is no production here to watch — no deploy or logs reachable from this repo. The `npm test` script runs `node --test`, which collects zero tests, so a green run is not evidence of anything.

Two things I deliberately did not do, in case you want either:
- **No test added** pinning "retired codes get no discount." The repo has no test file to extend, and adding the first one is a bigger call than you asked for — but it's the natural guard against this path being reintroduced.
- **No search beyond this repo.** `applyCoupon` was exported, and nothing else in this repo imported it; if another service or package imports it, that import now breaks rather than silently returning the total. Worth a check on your side if this is published.
