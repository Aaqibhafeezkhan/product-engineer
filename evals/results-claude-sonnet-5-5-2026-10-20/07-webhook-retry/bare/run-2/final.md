The accounting webhook now retries failed calls, and I committed it as `87fda24`. The four new tests pass.

- **What gets retried:** network errors, HTTP 429 and 5xx. That's up to 4 attempts, waiting 0.5s, 1s, then 2s between them. Other 4xx responses fail straight away, since resending the same payload won't fix them.
- **Behaviour change:** after the last attempt it now throws. Before, it only logged the failure and returned normally, which is how payouts went missing without anyone noticing. Nothing in the repo calls `notifyAccounting`, so I couldn't check the real callers. Any caller outside it needs to catch the error or queue the payout for later.
- **Duplicates:** a retry after a timeout could deliver the same payout twice if accounting did receive the first request. I didn't add an idempotency key because I don't know whether accounting supports one. If it does, adding a header with the payout ID would close that gap.

The change is in `src/webhook.js`, and the tests are in `src/webhook.test.js`.
