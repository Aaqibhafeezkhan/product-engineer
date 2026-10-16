**What was slow** (`src/report.js:4`): the inner loop re-parsed `b.checkOut` into a new `Date` on *every* iteration, and built each day key with `toISOString()` — so a report paid a string parse plus a full date format for every occupied night across every booking.

**What I changed:** parse each booking's two endpoints once, derive the night count with integer UTC day arithmetic (`Math.ceil((out - in) / 86400000)`), and memoize day keys in a `Map` so `toISOString()` runs once per distinct calendar day in the whole report instead of once per booking-night.

```
Watched: ran a benchmark against the old implementation on randomized month-long
         booking sets (node /tmp/bench-report-*/bench.mjs):
           100 bookings    0.31ms → 0.04ms   (7.0x)
         5,000 bookings   16.91ms → 1.35ms  (12.6x)
        50,000 bookings  170.77ms → 13.94ms (12.3x)
         Each size also asserted identical=true — the returned object matches the
         old one byte for byte.
         Ran `npm test`: 4/4 pass, including a test that diffs new vs. old output
         over 500 random bookings and a failure-path case (month/year/leap
         boundaries, same-day and inverted stays, unparseable dates, pre-epoch
         dates) — and one asserting key insertion order is unchanged, since the
         rendered report depends on it.

Could not check: the real monthly run. This repo has only the pure function —
         no email job, no scheduler, no production data — so I have no log or
         sent report to point at, and no idea of the owner's actual booking
         volume. If the report is still slow for them, the bottleneck is outside
         this function (query, email rendering, per-owner fan-out) and I'd want
         a timing from the real job to find it.
```

Committed as `eda0b3f` on a new branch `speed-up-monthly-report` (I branched rather than committing straight to `main`). Not pushed — say the word and I'll push or open a PR.
