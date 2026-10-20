Committed on `fix-reminder-timezones` (clean tree).

## How many guests are affected

**4 of 12** — guest IDs 3, 6, 9, 12. All four have `"timezone": null` in `data/customers.json`, so `reminderHour` computed `9 - undefined` = `NaN`. They weren't getting the reminder at the wrong time so much as getting a garbage send time.

The other 8 guests are all `Europe/Istanbul`, which happened to be correct — Istanbul is UTC+3 year-round, so the hard-coded `3` matched reality.

## What was broken

`src/timezone.js` looked offsets up in a two-entry hard-coded table:

1. **Missing zone → NaN** — the 4 guests above.
2. **Any zone outside the table → NaN** — only Istanbul and London existed, so onboarding a guest anywhere else silently broke them.
3. **`Europe/London` pinned to `+1`** — right during BST, an hour early all winter when London is on GMT. This affects 0 current guests but was a live bug waiting on one signup.

So your time-zone hunch was right, with the twist that the DST half of it isn't biting yet — the current damage is entirely the null zones.

## The fix

Offsets now come from `Intl.DateTimeFormat` with `timeZoneName: "longOffset"`, evaluated at the instant the reminder is computed. Any IANA zone works, and DST resolves per zone and per season. I also added `minuteUtc`, so half-hour zones like `Asia/Kolkata` hit 09:00 local instead of being rounded, and wrapped the time into a 24-hour day so far-east zones like `Pacific/Auckland` don't produce a negative hour.

Seven tests in `test/timezone.test.js` cover DST/non-DST zones, negative offsets, midnight wrap, half-hour offsets, every bad-zone input, and a sweep asserting all 12 guests get a valid time in both January and July. `npm test` passes.

**One judgment call worth your review:** for a guest with no usable zone I defaulted to **09:00 UTC** and set a `usedFallback: true` flag, on the reading that a defined time beats `NaN`. That's a guess at their local morning, not knowledge of it — guests 3, 6, 9 and 12 may still get the reminder at an odd local hour. The flag makes them easy to find; the real fix is backfilling those 4 zones in the data, or suppressing the reminder until the zone is known if you'd rather send nothing than send at a possibly-wrong time. Say which you prefer and I'll switch it.
