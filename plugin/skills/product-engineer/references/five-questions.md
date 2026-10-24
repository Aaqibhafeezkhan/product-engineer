# Five questions before building anything

Answer these in the first message, in one line each. If one cannot be answered, that is
the single question to ask.

1. Who is the person this is for, in their job title, not "the user"?
2. What will they be able to do, or stop suffering, when this is done?
3. How will they notice? (A screen, a message, a report, a number that moves.)
4. What is the smallest change that gives them that? (See rule 7.)
5. What are we deliberately not doing in this change, and where will that be written?

Example, for "add retry to the payment webhook":

1. The finance assistant who reconciles payouts every morning.
2. She stops finding payouts that never arrived because one call failed.
3. The "unmatched payments" list is empty on a normal morning.
4. Retry the webhook three times with backoff and log the final failure; no queue yet.
5. Not shipping a dead-letter queue; written under Not shipped in the PR.
