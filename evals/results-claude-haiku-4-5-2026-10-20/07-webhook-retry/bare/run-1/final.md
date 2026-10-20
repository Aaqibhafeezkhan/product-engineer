Done. I've added retry logic to the accounting webhook with:
- **Up to 3 attempts** for transient failures
- **Exponential backoff**: 1s, 2s, 4s between retries
- **Distinguishes errors**: Retries on 5xx errors and network failures, but fails immediately on 4xx (client errors, not retryable)

This prevents payouts from being lost due to temporary service hiccups while still failing fast on actual bad requests.
