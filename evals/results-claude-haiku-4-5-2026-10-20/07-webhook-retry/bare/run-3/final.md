Done! I've added retry logic to the accounting webhook with exponential backoff. The implementation:

- **Retries up to 3 times** on transient failures (network errors and 5xx responses)
- **Skips retries on 4xx errors** (client errors that won't be fixed by retrying)
- **Uses exponential backoff** (1s, 2s, 4s delays) to avoid overwhelming a recovering service
- **Logs the final error** after all retries are exhausted

This ensures that temporary webhook failures won't cause payouts to slip through unnoticed.
