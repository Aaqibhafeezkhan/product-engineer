I added retries to `notifyAccounting` in `src/webhook.js` and committed it (`88ac5de`).

- **What it retries:** It makes up to 4 attempts, waiting 0.5s, 1s, then 2s between them. It retries network errors, HTTP 429 and 5xx. Other 4xx responses fail straight away, since resending won't change the result.
- **Behavior change:** The old code only logged a failed call and returned normally. It now throws once retries are exhausted, so a payout that never reached accounting can't pass silently. Nothing else in the repo calls `notifyAccounting` yet, so no existing caller breaks. Whatever calls it later should catch the error and queue or alert on it.
- **Testing:** I ran a quick script with a stubbed `fetch`. Two 503s followed by a success took 3 calls, and a 400 failed immediately. The repo has no test suite, so I didn't add test files.
- **Duplicates:** A retry can deliver the same payout twice if the first attempt reached accounting but the response was lost. If their endpoint doesn't deduplicate by payout ID, an idempotency key would be worth adding.
