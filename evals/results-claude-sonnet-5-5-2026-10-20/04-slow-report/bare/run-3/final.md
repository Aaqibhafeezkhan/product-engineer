I rewrote `monthlyReport` in `src/report.js` to be about 10x faster and committed it as `00109fe`.

The old code created a `Date` object and called `toISOString()` for every night of every booking. The new code counts days as plain numbers and builds each date string once, then reuses it.

I compared the old and new versions on 20,000 random bookings, including one with an invalid date. The output was identical. The old version took 138ms and the new one 12ms.

The repo has no tests, so that comparison is the only check I ran.

I assumed the report is slow because of this per-day loop, since that's all `src/report.js` does. If the owner's slowness comes from somewhere else, such as fetching the bookings or sending the email, this change won't fix it.
