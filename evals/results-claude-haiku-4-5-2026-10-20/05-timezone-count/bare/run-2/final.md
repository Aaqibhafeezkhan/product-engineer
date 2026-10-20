## Summary

**Affected guests: 4** (IDs 3, 6, 9, and 12)

**The issue:** These 4 guests had `timezone: null` in the data, which caused the `reminderHour()` function to calculate `NaN` (invalid) reminder times. This broke their check-in reminders.

**The fix:** Added a fallback to use `Europe/London` as the default timezone when a guest has no timezone specified. Now all guests get valid reminder times:
- Istanbul guests: 09:00 local time (6:00 UTC)
- London/default guests: 09:00 local time (8:00 UTC)

The fix has been tested and committed.
