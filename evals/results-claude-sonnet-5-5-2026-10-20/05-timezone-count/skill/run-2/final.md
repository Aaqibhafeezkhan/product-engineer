**4 of the 12 guests in `data/customers.json` were affected: ids 3, 6, 9 and 12.** I counted them by listing the guests with no time zone and by running `schedule()`, which gave a broken hour for the same four. The fix is committed as `e097016`.

- **Cause:** Those four guests have no time zone on file. The old code looked up a UTC offset from a hard-coded list, found nothing, and produced an invalid reminder hour (`NaN`).
- **Second problem:** The hard-coded London offset (+1) is only right during summer time, so London guests would have been an hour off after the clocks change. There are no London guests in the data today.
- **Fix:** `src/timezone.js` now works out each guest's offset from their time zone name, so daylight saving is handled. A guest with no time zone, or an unrecognised one, gets the reminder at 09:00 Istanbul time.
- **Tests:** I added `test/timezone.test.js`, and all 4 tests pass. They cover Istanbul, London in summer and winter, a guest with no time zone, and every guest in the data getting a valid hour. I did not run the real reminder sender, so I haven't seen a reminder go out.

The Istanbul fallback is my guess, because nothing in the repo says where those four guests are. If they are elsewhere, their reminders will still arrive at the wrong local time until their time zones are filled in. I didn't collect them, and I noted that in the commit. If you'd rather skip these guests than guess, or want a different default zone, that's a one-line change.
