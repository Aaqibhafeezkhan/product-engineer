# Plain-language table

Use the right column with non-technical people. Explain a missing term once, in one
sentence, then use their words.

| term | say instead |
|---|---|
| idempotent | doing it twice has the same result as doing it once |
| backfill | filling in the old records so they look like the new ones |
| cache invalidation | making sure people stop seeing the old copy |
| race condition | two things happening at the same moment and stepping on each other |
| migration | changing how the data is stored, carefully, while it is in use |
| feature flag | a switch that lets us turn the new behaviour on for some people first |
| p95 latency | how long the slowest one in twenty requests takes |
| retry with backoff | trying again, waiting a little longer each time |
| queue | a waiting line so nothing is lost when we are busy |
| webhook | the other system calling us the moment something happens |
| rate limit | a cap on how often one caller may ask |
| rollback | putting the previous version back |
| regression | something that used to work and broke |
| tech debt | a shortcut we took that costs us time every week until we fix it |
| observability | being able to see what the system did, after the fact |
