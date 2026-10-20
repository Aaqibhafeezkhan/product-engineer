I removed the coupon code path from checkout and committed it as `f50993e`. I didn't run anything, and there are no tests in the repo.

- **`src/checkout.js`:** I deleted `applyCoupon`, which handled `SUMMER10` and `WELCOME`. `checkout(cart)` no longer takes a `code` argument, and `total` now equals `subtotal`.
- **`README.md`:** The note now says the coupon path has been removed. Before, it said the code path was still there.

A search for "coupon" found no other references in the repo. If another service calls `checkout(cart, code)`, the extra argument is simply ignored.
