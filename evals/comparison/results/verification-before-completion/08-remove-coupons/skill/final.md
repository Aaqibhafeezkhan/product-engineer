Done — committed as `77933cd`.

**What changed** (`src/checkout.js`):
- Deleted `applyCoupon` entirely, including the `SUMMER10` and `WELCOME` codes.
- Dropped the `code` parameter from `checkout(cart)`.
- `total` stays in the return value (now always equal to `subtotal`) so consumers reading `.total` don't break.

Also updated the README note that flagged the path as still live.

**Verified:** `checkout([{price:10},{price:5}])` → `{ subtotal: 15, total: 15 }`, and calling it with a stale extra argument (`checkout([{price:10}], "SUMMER10")`) returns `total: 10` — no discount, so the path is genuinely unreachable rather than just hidden. `npm test` passes but is vacuous: the repo has zero tests, so nothing guards this against regression. Grep for "coupon" across the repo now only hits the README's historical note.

Two things outside what I touched, in case they matter:
- Any caller elsewhere (another repo, a service) passing a coupon code now gets it silently ignored rather than erroring. That's the intended outcome here, but if you'd rather fail loudly on an unexpected argument, that's a small follow-up.
- If coupon codes were ever persisted on order records, those stored values are untouched — this change only closes the live path.
