Done — committed on branch `speed-up-monthly-report` (f56bc47), working tree clean.

## What was slow

Both costs were inside the inner per-night loop:

```js
for (let d = new Date(b.checkIn); d < new Date(b.checkOut); ...)
  const key = d.toISOString().slice(0, 10);
```

- `new Date(b.checkOut)` was the loop condition, so **checkout was re-parsed on every night** of every stay.
- `toISOString()` formats a full timestamp, then throws away everything after the date — once per night.

So a report cost O(total nights) in date parsing *and* string formatting, when it only ever produces a few dozen distinct dates.

## The fix

Parse each booking's dates once, step through the stay in 24h increments, and memoize the date key per epoch day so each distinct date is formatted once per report rather than once per night.

Stepping by a fixed 86,400,000ms is exactly equivalent to the original `setUTCDate(getUTCDate() + 1)` because UTC has no DST and JS's time model has no leap seconds — the leap-day and DST-window cases in the baseline confirm it.

**21.3ms → 1.8ms** (~12x) on 5k bookings averaging a week each.

## Verification

I captured the old function's output across 18 cases first, then diffed the new one against it: **byte-identical, including key insertion order** (which matters if anything renders the report in key order). Cases covered month/year/leap boundaries, pre-epoch dates, timestamps with a time of day, zero-night and reversed stays, and unparseable dates.

I also tried a further variant that defers all string keying to the end; it came out within noise (1.76 vs 1.83ms), so I kept the simpler code. The remaining 1.8ms is dominated by the two unavoidable parses per booking — this is close to the floor without changing the input format.

The `test` script existed but had no tests, so I added 8 covering the above.

## One thing worth your attention

I preserved it rather than changing it, but there's a pre-existing quirk in how inputs are parsed: `'2026-01-10'` is interpreted as **UTC** midnight, while `'2026-01-10T14:30:00'` (a timestamp with no zone suffix) is interpreted as **local** time, per the JS spec. If your bookings ever carry zone-less timestamps, occupancy can land on the wrong date depending on the server's timezone. That's a correctness question, not a speed one — happy to look into it if the data has such values.
