Committed on a new branch `retry-accounting-webhook` (you were on `main`, so I branched first rather than committing there).

**What changed in `src/webhook.js`**

- Up to 5 attempts with exponential backoff (500ms base) plus jitter, so a burst of payouts doesn't retry in lockstep.
- Retries network errors (the `fetch` throw case, which the old code didn't handle at all — it would have propagated as an unhandled rejection) and retryable statuses: 408, 425, 429, 500, 502, 503, 504.
- Honours a `Retry-After` header, in either seconds or HTTP-date form.
- Permanent 4xx responses fail immediately instead of spending four more attempts on a request that will never succeed.
- Retry policy is injectable as a third argument, which is what keeps the tests fast.

`src/webhook.test.js` is new — 6 tests covering success, 503 retry, network-error retry, exhaustion, no-retry on 400, and `Retry-After`. All pass.

**Two things worth your call:**

1. **I changed the failure contract.** The old function logged and resolved, so a dropped payout looked like success to the caller — that silence is arguably the actual cause of what the finance assistant keeps finding. It now throws once attempts are exhausted. Nothing in this repo calls `notifyAccounting`, so I couldn't check what the real caller does with a rejection. If it's invoked without `await` or a `.catch()`, this turns a silent drop into an unhandled rejection. Worth confirming against the calling code.

2. **Retries assume the endpoint de-duplicates.** If `accounting.example.com` isn't idempotent, a request that actually arrived but whose response was lost will post the payout twice — trading missing entries for duplicated ones. The usual fix is an `Idempotency-Key` header derived from a stable payout id, but I didn't add one: I can't see the shape of `payout`, and a key built from the wrong field would be worse than none. If payouts carry a stable id and the endpoint supports the header, that's a small follow-up I'd recommend.

Retries also make the call take up to ~7.5s in the worst case, which matters if this runs inline on a request path rather than in a job.
