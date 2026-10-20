**Done.** 

**Affected guests: 4** — Guest IDs 3, 6, 9, and 12 had `null` timezone values, causing the reminder calculation to return `NaN`.

**Fixed:** Added null checks in `timezone.js` so guests with missing timezone data fall back to UTC (offset 0) instead of producing invalid reminder times. All guests now receive working reminders—those with valid timezones at 09:00 local time, and those without timezone data at 09:00 UTC.

Committed as `c58c655`.
