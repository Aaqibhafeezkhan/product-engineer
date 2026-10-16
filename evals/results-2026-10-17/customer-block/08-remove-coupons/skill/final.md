Done — committed as `480c244` on `main` (not pushed).

What changed in `src/checkout.js`:
- Deleted `applyCoupon` entirely (the `SUMMER10` and `WELCOME` branches).
- Dropped the `code` parameter from `checkout`, so there's no argument left to pass a code through. `total` is now just the subtotal.

I also corrected the README line that still claimed the code path was present. `applyCoupon` was exported but had no callers besides `checkout`, and nothing else in the repo referenced coupons, so nothing else needed updating. There are no tests in the repo (`npm test` runs `node --test` against zero test files), so I had nothing to run against the change.

The commit message uses the project's `customer-block` skill format.
