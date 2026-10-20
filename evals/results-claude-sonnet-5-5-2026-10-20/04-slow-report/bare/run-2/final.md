I sped up `monthlyReport` in `src/report.js` and committed it as `f1b40e6`. I didn't time it, so I can't tell you how much faster it is.

The old loop built a new `Date` for `checkOut` on every day of every booking and changed a `Date` in place each step. The new version reads the end timestamp once per booking and steps through milliseconds. It still calls `toISOString` once per day to get the key.

I compared the old and new output on 2,000 generated bookings and the results were identical.

The function still does work proportional to total booked nights. If it's still too slow on real data, the next step would be counting each booking's start and end and totalling per day afterward, instead of visiting every night. That's a bigger change, so I held off.
