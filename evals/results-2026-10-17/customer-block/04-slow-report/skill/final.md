Committed as `3d014a3`.

## What was slow

`monthlyReport` had two problems in its inner loop (`src/report.js:4`):

1. `new Date(b.checkOut)` sat in the **loop condition**, so the checkout date string was re-parsed once per night of every booking.
2. Every night allocated a fresh `Date` plus an ISO string to build the day key — which made the function GC-bound.

## What I changed

Parse each booking's bounds once, walk the range as integer milliseconds, and cache the day key in a `Map`.

The cache is keyed on **day index** (`Math.floor(t / MS_PER_DAY)`), not the raw timestamp. That detail matters: keyed on the timestamp, bookings with varied check-in times would get zero cache hits and the Map would grow with every distinct time-of-day. Keyed on day index it's bounded by the report's date range, since the ISO date depends only on the day.

**20k bookings: 38ms → 6ms** (~6.8x), measured against the previously committed file, not an inline copy.

## On correctness

The cache is the load-bearing change, so I diffed old vs. new output across empty input, same-day and reversed ranges, month/leap/year boundaries, date-only strings, unparseable dates, pre-epoch dates, and randomized sets with varied times — identical on all of them.

One behavior I deliberately **preserved rather than fixed**: with a non-midnight check-in, the function counts 24-hour periods from the check-in time, so `Oct 24 14:30 → Oct 27 09:00` counts 24/25/26 and not the 27th. Normalizing to calendar midnights would be a defensible reading of "occupancy," but it changes reported numbers, so it's your call — not something to smuggle into a perf commit. It's pinned in a test either way.

Two notes on scope:

- I added `src/report.test.js` (6 tests). `npm test` was wired to `node --test` but the repo had no tests, so nothing guarded a rewrite of this shape. All pass.
- The benchmark harness stayed in `/tmp`, out of the repo.

Worth flagging: my first few benchmark runs were badly noisy — the original measured 55ms then 72ms, and one variant looked *slower* than the baseline, which was impossible. Per-variant isolated processes fixed it. The noise was itself the symptom: allocation pressure was the real cost.
