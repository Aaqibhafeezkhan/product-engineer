Committed on `retry-accounting-webhook` (clean tree).

**What `notifyAccounting` now does** (`src/webhook.js`):
- Retries transient failures — network errors and 408/425/429/5xx — up to 4 times with jittered exponential backoff (250ms base, 8s cap).
- Fails fast on non-retryable 4xx, since retrying a malformed or rejected payload just burns time.
- Added a 10s timeout. Worth calling out: a hung request was a second way to lose a payout, and it would never have hit a retry no matter how many I added.

**Two things I changed beyond "add retries"** — both are load-bearing for the problem you described, so flagging them explicitly:

1. **It now throws when retries are exhausted**, instead of returning normally after a `console.error`. Retries alone don't fix your reporting gap: if accounting is down for a minute, five attempts still fail and the old code would return as if nothing happened. The caller needs to know in order to queue or alert. No callers exist in this repo, so nothing breaks here, but **anything calling this in your real codebase needs a try/catch or it'll start propagating failures.** That's the one thing to check before merging.

2. **An `idempotency-key` header** derived from `payout.id`. Retrying a POST risks booking a payout twice, which for accounting is worse than dropping it. Caveat: this only prevents duplicates **if the accounting system honors that header** — I can't verify that from here, and it's silently ignored if not. Worth confirming against their API docs, including whether they expect a different header name.

One gap I did not close: if all retries fail, the payout is still lost — just loudly now instead of silently. Durable fix is a persistent queue or outbox so it can be replayed, which is a bigger change than you asked for. Happy to take that on if useful.

I also added `src/webhook.test.js` (9 tests) since the existing `fetchImpl` parameter made the retry paths injectable, and I wanted to verify the backoff and no-retry-on-4xx behavior rather than assert it. My first backoff assertion was flaky — jitter let two adjacent delays tie at 250ms — so it now checks each delay against its expected window; I ran the suite five times to confirm.
