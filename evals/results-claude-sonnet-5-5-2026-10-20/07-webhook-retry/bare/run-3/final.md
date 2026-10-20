I added retries to `notifyAccounting` in `src/webhook.js` and committed it as `76b41d2`. The three new tests in `src/webhook.test.js` pass.

- **Retries:** It makes up to 4 attempts, waiting 0.5s, 1s, then 2s between them. It retries on network errors, 429 and 5xx responses. Other 4xx responses are not retried, since resending won't fix them.
- **Behavior change:** If every attempt fails, it now throws. Before, it only logged the error, which is why failed payouts were dropped without anyone noticing. Nothing in this repo calls `notifyAccounting`, so I couldn't check the callers. Wherever it is called, the caller needs to catch the error or queue the payout for a later retry.
- **Duplicates:** A retry can deliver the same payout twice if the first request reached accounting but the response was lost. I didn't add an idempotency key because I don't know your payload or whether accounting supports one. If it does, I'd send the payout ID as the key.
