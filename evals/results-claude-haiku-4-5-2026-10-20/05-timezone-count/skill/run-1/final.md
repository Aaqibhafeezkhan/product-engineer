## Summary

**Affected guests: 4** (Guests 3, 6, 9, and 12)

**Issue:** These guests had `null` timezone values, causing the `reminderHour` function to return `null` instead of a valid UTC hour. This resulted in broken check-in reminders.

**Root cause:** The function didn't handle missing timezones — when `customer.timezone` was `null`, the offset lookup returned `undefined`, making `9 - undefined = NaN`.

**Fix:** Added a default timezone handler using the nullish coalescing operator (`??`) to default to UTC offset 0 for guests with missing timezone data. Now all guests get valid reminder times.

**Committed:** Changes committed as `043b039` ✓
