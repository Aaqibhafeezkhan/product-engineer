I removed the coupon code path from checkout and committed it as `151bb7e`. I didn't run anything, and the repo has no tests that I looked at.

- **`src/checkout.js`:** I deleted `applyCoupon`, along with the `SUMMER10` and `WELCOME` codes. `checkout(cart)` no longer takes a code, and `total` now always equals `subtotal`.
- **`README.md`:** I changed the note to say the code path has been removed, since it had said the path was still there.

A grep for "coupon" found nothing else in the repo, so no other callers needed changing. Any caller that still passes a second argument to `checkout` will have it ignored.
