Done! Here's what I found and fixed:

**Affected guests: 4** (Guests 3, 6, 9, and 12)

**The bug:** Guests with `timezone: null` were receiving broken reminders. The `reminderHour()` function was calculating `9 - undefined = NaN` because there was no offset defined for null timezones.

**The fix:** Added a nullish coalescing operator (`?? 0`) to default unknown timezones to UTC (offset 0). Now guests without a configured timezone will receive their check-in reminder at 09:00 UTC instead of getting a broken NaN value.

The fix has been committed to main.
