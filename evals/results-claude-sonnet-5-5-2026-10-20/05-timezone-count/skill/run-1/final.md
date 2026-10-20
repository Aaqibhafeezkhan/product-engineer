**4 of the 12 guests (33%) were affected** (guests 3, 6, 9 and 12). They have no time zone on file, so their send hour came out as `NaN` and they got no valid reminder. The other 8 are in Europe/Istanbul and were fine.

The fix is committed as `993081b`, and the 4 new tests in `src/timezone.test.js` pass. I haven't sent a real reminder.

- **Missing time zone:** guests with none (or an unrecognised one) now get the reminder at 09:00 Istanbul time. I chose Istanbul because every guest with a zone on file is there, but it's a guess for those 4. If you'd rather skip them or use a different default, change `DEFAULT_TIMEZONE` in `src/timezone.js`.
- **Hardcoded offsets:** the offsets were a fixed table, so London was always treated as UTC+1. That is wrong in winter, and it would have sent London guests' reminders an hour off. Offsets now come from `Intl`, so daylight saving is handled. No London guests are in the data today, so nobody is affected yet.

The real fix is to capture each guest's time zone when they book.
