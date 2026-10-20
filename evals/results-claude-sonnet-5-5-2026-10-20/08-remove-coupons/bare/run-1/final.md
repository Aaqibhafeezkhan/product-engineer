I removed the coupon code path from checkout and committed it as `e7b3ceb`. I didn't run anything, and the repo has no tests that I looked at.

- **`src/checkout.js`:** I deleted `applyCoupon`, which handled `SUMMER10` and `WELCOME`. `checkout(cart)` no longer takes a code, so `total` now always equals `subtotal`.
- **`README.md`:** The note said the code path was still there, so I changed it to say it has been removed.

A search for "coupon" turned up only those two files. Nothing else in the repo called `checkout` with a code, but any caller outside this repo that still passes one will have it ignored.
