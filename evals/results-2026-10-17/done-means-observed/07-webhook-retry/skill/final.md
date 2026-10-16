Done — committed as `8a72d99` on branch `retry-accounting-webhook`.

`src/webhook.js:14` now retries up to 4 attempts with exponential backoff plus jitter, and `src/webhook.test.js` covers the behavior (6 tests, all passing).

Two things I changed beyond strictly "add retries", because retries alone wouldn't have fixed the reported symptom:

- **It now throws when attempts are exhausted.** The old code logged to `console.error` and returned normally, so a caller couldn't tell a delivered payout from a dropped one — retries would just shrink the window without closing it. Check your callers: anything that `await`s `notifyAccounting` will now see a rejection where it previously saw silent success, so it needs a catch that queues or alerts rather than letting the payout vanish again. I left that handling out since I can't see the call sites in this repo.
- **It sends an `idempotency-key` header** taken from `payout.id`. Retrying a POST can deliver the same payout twice, which turns a missing-entry problem into a double-entry one. The header is only useful if the accounting system actually honors it — worth confirming with whoever owns that endpoint, and if they key on a different field name, that's a one-line change.

Also worth noting: non-retryable 4xx responses now fail immediately rather than being retried, on the assumption that a rejected payload won't be accepted on a second identical try. If accounting returns something like a 409 on a transient condition, add it to `isRetryableStatus` at `src/webhook.js:8`.
