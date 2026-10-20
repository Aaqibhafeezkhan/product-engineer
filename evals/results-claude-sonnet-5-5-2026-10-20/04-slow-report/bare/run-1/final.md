I sped up `monthlyReport` in `src/report.js` and committed it as `47ae02b`. On 3,000 random bookings it went from about 20 ms to about 2.5 ms, roughly 8× faster. The repo has no tests, so I checked it with a throwaway script (not committed) that runs the old and new code on the same bookings. Both give identical output, including key order and an invalid date.

The old code created new `Date` objects on every loop iteration, once for the end-date comparison and once for the day-key string. It now parses each booking's dates once and steps through the days as plain millisecond numbers. It also caches the date string for each day, so it's built once rather than once per booking.

The 2.5 ms comes from random test data, not the owner's real bookings. If the report is still slow on real data, the slowness is probably somewhere else, such as fetching the bookings or sending the email, and that isn't in this repo.
