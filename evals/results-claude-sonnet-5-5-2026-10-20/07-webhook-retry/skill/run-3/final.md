I added retries to the accounting webhook and committed them as `45058c0`. The four new unit tests pass, but they use a fake `fetch`. I haven't run it against the real accounting endpoint.

- **What it retries:** network errors, 429 and 5xx responses, up to 4 attempts with waits of 0.5s, 1s and 2s. Other 4xx errors aren't retried, because sending the same request again won't fix it.
- **Return value:** `notifyAccounting` now returns `true` or `false` instead of nothing. It still doesn't throw, so existing callers behave as before.
- **Code and tests:** the change is in `src/webhook.js`, with tests in `test/webhook.test.js`.
- **Not built:** there is no persistent queue. If accounting is down for longer than the retry window (about 3.5s), the payout is only logged and still won't reach accounting. A queue or a re-send job would cover longer outages. I left it out because you asked for retries.

The commit message has the "For the customer" block and the "Not shipped" note, following the repo's product-engineer skill.
