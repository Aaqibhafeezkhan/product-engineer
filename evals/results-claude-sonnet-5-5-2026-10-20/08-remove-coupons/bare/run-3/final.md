I removed the coupon code path from checkout and committed it as `6736c58`. I didn't run anything, and there are no tests in the repo.

- **`src/checkout.js`:** I deleted `applyCoupon`, which handled `SUMMER10` and `WELCOME`. `checkout(cart)` no longer takes a code, and `total` now equals `subtotal`. The return shape `{ subtotal, total }` is unchanged.
- **`README.md`:** the note now says the coupon code path has been removed, instead of saying it's still there.

A search of the repo found no other callers. If anything outside this repo still calls `checkout(cart, code)`, the extra argument is now ignored.
