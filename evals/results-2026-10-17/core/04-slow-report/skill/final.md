Committed on `speed-up-monthly-report` (I branched rather than committing straight to `main`).

**What was slow:** the per-night loop re-parsed `checkOut` and called `toISOString()` on every single night. `src/report.js:4` ran two `Date` constructions and a string format per occupied night.

**The fix:** parse each booking's dates once, step the timestamp by whole UTC days, and cache the date key per distinct day — so `toISOString()` runs about 30 times per report instead of once per night.

**Measured** (mean ms/call, this machine):

| case | before | after | |
|---|---|---|---|
| 1k bookings, ≤5 nights | 1.88 ms | 0.23 ms | 8.2x |
| 10k bookings, ≤5 nights | 17.55 ms | 2.24 ms | 7.8x |
| 10k bookings, ≤30 nights | 82.01 ms | 4.38 ms | 18.7x |

Worth flagging: my first instinct was that the repeated `checkOut` parse was the hot spot. I benchmarked that fix alone and it only bought **1.18x** — the string formatting was the real cost. The measurement changed the patch.

**Output is unchanged**, key order included — verified against the old implementation on generated data plus 19 edge cases (month/leap-day/year boundaries, DST windows, times on check-in/out, zero-night and reversed stays, unparseable dates, `Date` and epoch-ms inputs). Using `new Date(x).getTime()` rather than `Date.parse(x)` is what preserves `Date`-object and numeric inputs; `Date.parse` would have silently reinterpreted those as local time.

I also committed `src/report.test.js` (7 tests). The repo declared `node --test` with no tests, and these checks were the evidence for the change, so leaving them in /tmp seemed wrong. They pass against both the old and new code, which is what makes them a real guard.

**Two things I did not do, and one caveat on "done":** I haven't observed this on a real report run — there's no booking data, no job runner, and no production logs in this repo, so my numbers come from a synthetic dataset I generated, not from the owner's actual volume. And I changed only the calculation. If the owner's slowness is actually in mail delivery or in the query that loads the bookings, this won't be the fix they feel. Before you close the ticket with them, it's worth timing one real run — if you can tell me roughly how many bookings a typical report covers, I can say whether 80 ms of arithmetic was ever enough to explain the complaint.
