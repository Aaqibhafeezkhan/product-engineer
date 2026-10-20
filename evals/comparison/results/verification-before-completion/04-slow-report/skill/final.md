Committed as `c52d845`, working tree clean.

## What was slow

`src/report.js:4` had two costs inside the per-night loop:

```js
for (let d = new Date(b.checkIn); d < new Date(b.checkOut); ...)
```

- **`new Date(b.checkOut)` was the loop condition** — so the checkout date string was re-parsed on *every night of every booking*. This dominated the runtime.
- **`toISOString()` per night** formatted a full 24-char timestamp just to take the first 10 chars, re-doing the work for days many bookings share.

## The fix

Parse each end of the stay once, step by a fixed 24h, and memoize the day → `"YYYY-MM-DD"` key so overlapping bookings reuse it. The fixed step is safe because the original used `setUTCDate`, and UTC days are always exactly 86400s — no DST exposure either way.

| Workload | Before | After | |
|---|---|---|---|
| 1 month, 2k bookings | 5.8ms | 0.7ms | **8.0x** |
| 1 year, 20k bookings | 56.0ms | 6.7ms | **8.4x** |
| Long stays (90 nights) | 54.5ms | 2.6ms | **20.9x** |

Output is byte-identical to the old code across 20 hand-picked edge cases and 20,000 fuzzed inputs (random times of day, pre-epoch dates, `Date` objects, epoch numbers, unparseable values, DST boundaries).

## Two things worth flagging

**I kept `new Date(x).getTime()` rather than the faster `Date.parse(x)`.** `Date.parse` only accepts strings, so it would silently return `NaN` — a silently empty report — if any caller passes a `Date` object or epoch number. The old code accepted all three, so I preserved that. It's one allocation per booking, not per night, so it doesn't show up in the numbers.

**The file had no tests, so I added `test/report.test.js` (9 tests).** Mutation-checking them caught a genuine gap in my own coverage: `Math.trunc` instead of `Math.floor` passed the suite initially. Those differ only for a pre-epoch stay with a time of day, where truncating folds nights onto the wrong dates — the implementation was right, but nothing was holding it in place. That case is now covered, and all six mutants I tried fail the suite.

One thing I did **not** change: the function still returns a plain object and iterates one entry per night, which is inherent to counting per-day occupancy. If reports ever get slow again at much larger scale, the next lever is the caller — e.g. filtering bookings to the report month before calling this, since right now a year of bookings is fully expanded even to render one month.
