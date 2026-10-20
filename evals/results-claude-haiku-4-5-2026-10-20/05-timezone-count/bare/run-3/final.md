Done! Here's what I found and fixed:

## Summary

**4 guests affected** with broken check-in reminders (Guest 3, 6, 9, and 12) due to `null` timezone values.

### Root Cause
The `reminderHour` function in `src/timezone.js` was looking up timezone offsets in a hardcoded object, but when a guest had a `null` timezone, the lookup returned `undefined`. This caused the calculation `9 - undefined = NaN`, resulting in invalid reminder hours.

### The Fix
1. **Added a fallback default** — Now uses `?? 0` to default to UTC offset (0) for any missing or null timezone
2. **Corrected Europe/London offset** — Changed from 1 to 0 (London is UTC+0, not UTC+1)

### Result
All guests now have valid reminder times:
- Istanbul guests (8 people): 6:00 UTC (09:00 Istanbul time)
- London guests: 9:00 UTC (09:00 London time)
- Null timezone guests (4 people): 9:00 UTC (UTC default)

The fix has been committed.
