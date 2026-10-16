Done — committed on branch `retry-accounting-webhook` (`bf571cb`), working tree clean.

**What changed** (`src/webhook.js:1`)
- Up to 4 attempts with exponential backoff (500ms base) plus jitter, so a batch of payouts failing together doesn't retry in lockstep.
- Retries network errors and transient statuses (408, 429, 500, 502, 503, 504). Other 4xx are not retried — the request itself is wrong, so re-POSTing just sends the same bad payload again.
- Each attempt sends the same `idempotency-key` header (the payout id).
- `notifyAccounting` now returns `true`/`false` for delivery. It still never throws, so existing callers behave as before (there are none in this repo).

`src/webhook.test.js` covers first-call success, retry-then-succeed, network-error retry, no-retry on 400, giving up at the limit, and a stable idempotency key. All 6 pass (~8s — the suite waits on real backoff delays).

**Two things worth your attention:**

1. **The idempotency key only helps if accounting honors it.** Retrying a POST means a payout can be delivered twice — the first call may have landed with only the response lost. If that endpoint doesn't dedupe on `idempotency-key`, these retries can double-post payouts, which is a worse failure than the one you're fixing. Worth confirming against their webhook docs. Relatedly, the header is only sent when `payout.id` exists; I couldn't find the payout shape anywhere in the repo to verify that field name.

2. **Retries narrow the gap but don't close it.** After 4 failed attempts the payout is still dropped with just a log line — exactly the original failure mode, only rarer. If accounting is down for a few minutes, these retries cover it; if it's down for an hour, you'll still be hunting missing payouts. Closing it properly needs durable state — a dead-letter table or queue the morning reconciliation can drain. That's past what you asked for, so I left it; say the word and I'll add it.
