Done — committed as `5d69215`.

What changed in `src/checkout.js`:
- Deleted `applyCoupon` entirely (the `SUMMER10` 10% and `WELCOME` -$5 branches).
- Dropped the now-unused `code` parameter from `checkout`, so `total` is simply the subtotal.

I kept the return shape `{ subtotal, total }` so existing callers don't break. Two things worth knowing:

- `applyCoupon` was a public export of this package. Nothing in the repo referenced it, but if anything outside this repo imports it, that import now fails. Searching here can't rule that out.
- `checkout(cart, code)` calls from outside still work — JS ignores the extra argument — so no caller breaks, the code just stops having any effect.

`npm test` passes but the repo has zero tests, so that's not real coverage; I verified behavior directly instead (`checkout([{price:10},{price:5}])` → `{subtotal:15,total:15}`, and `checkout` is the module's only export). I also updated the README line that described the path as still present.
