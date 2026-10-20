I sped up the monthly report and committed it as `1fc02d1`.

The old code built a date object and formatted a date string for every booked night. The new code counts nights with plain arithmetic and builds each day's string once. The report has the same figures, keys and key order as before.

On a generated test of 20,000 bookings, the report went from about 115 ms to about 10 ms. I ran that once on this machine, and the script isn't committed. I haven't run it on the real monthly email job or on real owner data, so I can't say how much faster the owner's actual report will feel.

The repo has no tests, so the only check that the output is unchanged is that comparison on the generated data.
