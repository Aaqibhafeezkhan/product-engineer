Done — committed as `d31be8c`.

**What I removed** (`src/checkout.js:1`):
- `applyCoupon()` entirely, including the two live discounts (`SUMMER10` → 10% off, `WELCOME` → $5 off).
- The `code` parameter on `checkout()`, so there's no longer any way to feed a code in.

`checkout()` still returns `{ subtotal, total }` so existing callers don't break; `total` is now just `subtotal`. Also fixed the README line that said the code path was still there.

Two things worth knowing:

- **`applyCoupon` was an exported symbol**, and nothing else in this repo imported it. Grep only covers this repo, so if anything outside it (another package, a server route) imports `applyCoupon` from this module, it will now fail at import. Worth a quick check on your side if this module is consumed elsewhere.
- **There are no tests at all** here — `npm test` reports 0 tests, so nothing verified this beyond the smoke check I ran (`checkout([{price:10},{price:5}])` → `{ subtotal: 15, total: 15 }`). I didn't add tests since that wasn't the ask, but say the word and I will.
