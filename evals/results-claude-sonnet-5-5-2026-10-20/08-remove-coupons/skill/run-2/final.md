I removed the coupon code path from checkout and committed it as `6a220a0`. I didn't run or test anything.

- **`src/checkout.js`:** I deleted `applyCoupon` (the `SUMMER10` and `WELCOME` codes). `checkout(cart)` no longer takes a code and returns `total` equal to `subtotal`.
- **`README.md`:** I changed the note to say the coupon code path has been removed.

A grep for coupon, promo and discount found no other references in the repo. Any caller outside it that still passes a code to `checkout` will have the extra argument ignored.
