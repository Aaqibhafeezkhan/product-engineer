I sped up `monthlyReport` in `src/report.js` and committed it as `576d381`. On a synthetic run of 20,000 bookings it dropped from about 190 ms to about 11 ms.

The old code built new `Date` objects for every night of every booking. The new version steps through plain millisecond timestamps and builds each day's date string only once.

I compared the old and new output on that same data, and the entries and their order are identical. The repo has no tests, so that comparison is the only check. I haven't run it against real booking data, so I don't know how much faster the owner's actual report will be.

I didn't change how the report is built or emailed, so if the slowness is somewhere else, such as loading the bookings or sending the email, this won't help.
