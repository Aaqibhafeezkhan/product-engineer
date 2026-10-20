Done! I've added retry logic to the accounting webhook with exponential backoff. The changes include:

- **Up to 3 retries** with exponential backoff (1s, 2s, 4s delays)
- **Retries only transient failures**: 5xx errors, 408 Timeout, and 429 Too Many Requests
- **Fails immediately** on non-retryable errors like 4xx client errors
- **Error logging** at each stage so you can track what's happening

This ensures payouts won't be lost due to temporary webhook failures. The commit is ready on main.
