Done — committed as `d8abc30` on branch `retry-accounting-webhook`.

**What `notifyAccounting` does now** (`src/webhook.js`):
- Retries up to 4 attempts with exponential backoff plus jitter, honouring `Retry-After` when the server sends it.
- Retries only what can plausibly succeed later: network/throw errors and 408, 425, 429, 5xx. A 400 or 422 fails immediately rather than burning three more attempts on a request that will never be accepted.
- Sends a stable `idempotency-key: payout-<id>` on every attempt.
- Added `src/webhook.test.js` (6 tests, all passing via `npm test`) with injectable `fetch` and `sleep`.

Two decisions worth your sign-off, since both go slightly beyond "add retries":

**It now throws after exhausting retries.** Retries alone wouldn't have fully fixed what the finance assistant is seeing. The old code logged to `console.error` and returned normally, so the caller treated a dropped payout as a success — retries shrink that window but don't close it. Throwing makes a genuinely failed payout visible upstream. If the caller isn't ready for that, it'll surface as a new exception in the payout path; say the word and I'll switch it to returning a result object instead.

**The idempotency key assumes two things I couldn't verify here.** `src/webhook.js` is the only source file in the repo, so I don't know the payout object's shape — I read `payout.id`, falling back to `payout.payoutId`, and omit the header if neither exists. I also don't know whether `accounting.example.com` actually honours `idempotency-key`. If it ignores the header, retrying a request that *did* land but whose response was lost will double-book the payout — worth confirming against their API docs before this ships.
