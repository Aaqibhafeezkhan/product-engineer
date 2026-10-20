I removed the coupon code path and committed it as `3bb7880`. I didn't run anything or add tests.

- **`src/checkout.js`:** I deleted `applyCoupon`, along with the `SUMMER10` and `WELCOME` codes. `checkout(cart)` no longer takes a code, and `total` now always equals `subtotal`.
- **`README.md`:** The note now says the code path has been removed. It used to say the code was still there.

Nothing else in the repo calls `checkout()`, so no callers needed changes. Anything outside this repo that passes a code will have it silently ignored.
