I sped up `monthlyReport` in `src/report.js` and committed it (`42a11fa`). On a synthetic set of 20,000 bookings it dropped from about 160 ms to about 10 ms, roughly 15x.

The old loop built a `Date` and an ISO date string for every night of every booking. It now counts nights by integer UTC day and formats each distinct day once at the end.

- **Same numbers:** On that synthetic set the output matched the old version exactly. `npm test` passes, but the repo has no tests for this function, so that check says little.
- **Key order:** The result's keys now come out in date order. Before, they came out in the order bookings were processed. The values are the same.
- **Not measured:** I didn't test with real owner data, and I didn't time the email step. If the report is still slow in practice, the cause may be the data query or the send rather than this function.
