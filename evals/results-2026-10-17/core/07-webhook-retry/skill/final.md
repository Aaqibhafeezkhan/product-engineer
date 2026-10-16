Committed as `4f4a23e` on `main`.

**What the code does now** — `src/webhook.js:35`: up to 5 attempts, backing off ~250ms → 2s with jitter, honouring `Retry-After`. It retries dropped connections and the "busy, try again" statuses (408, 425, 429, 5xx), but stops on any other 4xx, since resending a body accounting already rejected on its merits just gets rejected again.

**The duplicate risk, handled but not closed.** Retrying a POST can make accounting record the same payout twice when the first call landed and only the reply was lost — swapping the finance assistant's missing payouts for doubled ones. Every attempt sends the same `idempotency-key` from the payout id so accounting *can* collapse the retry. I could not verify the accounting system honours that header; if it ignores it, duplicates are still possible. That's worth one question to whoever owns that endpoint.

**What I observed.** Six tests pass, covering first-try success, recovery after a 503, recovery after `ECONNRESET`, no-retry on 422, give-up after the budget, and a constant key across attempts. Against a fake that never recovers, three real-clock runs took 2266ms, 3438ms and 2266ms before giving up — so the caller waits about three seconds in the worst case, not an unbounded hang. **No payout has run through this against the real accounting system, and I have not checked a morning reconciliation since the change** — so the thing the finance assistant actually complains about is not yet confirmed fixed.

**What I deliberately left out** (also recorded in the commit):

- **Durable storage on exhaustion.** An outage longer than ~3 seconds still loses the payout — it's logged, not queued. A dead-letter table or outbox is the real fix and is a bigger change than you asked for.
- **Alerting.** The give-up path writes to `console.error`; nobody gets paged.

Those two are why I'd call this a narrowing of the gap rather than a seal. The next cheapest step, if the assistant keeps finding gaps, is persisting the failures rather than lengthening the retries.
