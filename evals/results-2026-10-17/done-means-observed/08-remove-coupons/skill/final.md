Done. `applyCoupon` and the `code` parameter are gone from `src/checkout.js:1` — `checkout(cart)` now returns `total` equal to `subtotal`, so neither `SUMMER10` nor `WELCOME` can be triggered by any caller. I also corrected the stale README line that said the path was still there.

What I verified:
- `checkout([{price:10},{price:5}])` returns `{ subtotal: 15, total: 15 }`, and `applyCoupon` is no longer an export.
- Grepped the whole repo (excluding `.git`): `checkout.js` was the only file referencing `checkout`/`applyCoupon`, so dropping the second parameter breaks no in-repo caller.

What I could not check: `npm test` passes but runs **zero** tests — there are no test files, so nothing exercises checkout. And if anything outside this repo imports `applyCoupon` or calls `checkout(cart, code)`, it will now get `undefined`/an ignored argument; that's beyond what I can see from here.

Committed on a new branch `remove-coupon-path` (`412a390`) rather than directly on `main` — say the word if you'd like it on `main` or pushed.
