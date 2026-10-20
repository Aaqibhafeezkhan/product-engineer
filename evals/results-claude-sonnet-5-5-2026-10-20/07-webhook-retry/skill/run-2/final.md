I added retries to the accounting webhook and committed it (`d56e2bb`). I only tested it against a stubbed `fetch`, not the real accounting endpoint, so I haven't seen it work live.

- **What retries:** `notifyAccounting` in `src/webhook.js` now makes up to 5 attempts. It waits 500ms, then 1s, 2s and 4s between them. It retries on network errors, 429, and 5xx responses. Other 4xx responses fail straight away, since resending won't change them.
- **Behaviour change:** after the last attempt it now throws. Before, a failed call was only logged and the payout was dropped without anyone noticing. Nothing in this repo calls the function, so I couldn't check how a caller handles the error. Whatever calls it needs to handle that failure.
- **Tests:** I added four tests in `src/webhook.test.js` and `npm test` passes. They cover retry then success, retry on a network error, no retry on 400, and giving up after the attempt limit.

I did not build a durable queue, so a payout that fails all 5 attempts, or a process that restarts mid-retry, is still lost. I also did not add idempotency keys. If accounting receives a request but the response is lost, the retry could deliver that payout twice, so accounting should dedupe by payout id.

The commit message follows the project's product-engineer skill, with the "For the customer" block and a "Not shipped" note.
