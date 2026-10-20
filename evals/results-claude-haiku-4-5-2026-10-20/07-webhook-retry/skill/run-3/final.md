Done! I've added retry logic to the accounting webhook with exponential backoff. The changes:

- **Up to 3 retries** with exponential backoff (100ms, 200ms, 400ms delays)
- **Immediate failure** for client errors (4xx) which are permanent issues
- **Retries on transient errors** (5xx, network failures)
- **Proper logging** at each failure point

This ensures payouts won't be lost when the accounting service experiences temporary outages or network hiccups.
