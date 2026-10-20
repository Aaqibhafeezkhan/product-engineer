**4 of the 12 guests were affected** (IDs 3, 6, 9 and 12). Their `timezone` is `null` in `data/customers.json`, so `reminderHour` returned `NaN` for them. I committed the fix as `8fdaf51`, and the new tests pass.

**What changed in `src/timezone.js`:**
- **Missing or invalid time zone:** `schedule()` now leaves those guests out instead of producing a `NaN` hour, so nobody gets a broken reminder. I chose skipping over a default time like 09:00 UTC because a guessed time would be a wrong reminder too.
- **London daylight saving:** the old code hard-coded London as UTC+1, which is only right in summer. I replaced the fixed offsets with `Intl`, so London is correct all year. No London guests are in the data today, so this only matters once you add some.

I added `src/timezone.test.js` to cover both changes.

**Decision for you:** the 4 guests with no time zone now get no reminder at all. To fix that for good, fill in their time zones in the data. If you'd rather they get a reminder at a default time, I can add one.
