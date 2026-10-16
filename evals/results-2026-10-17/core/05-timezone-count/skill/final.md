**4 guests are affected today** — ids 3, 6, 9, 12 of the 12 rows in `data/customers.json`. All four have `timezone: null`, so the old code computed `9 - undefined` = `NaN` and their send time was not a time at all.

While fixing that I found the "wrong time" report had more than one cause. The reminder hour came from a two-entry hardcoded table, `{ Europe/Istanbul: 3, Europe/London: 1 }`:

| Defect | Scope (counted) |
|---|---|
| Zone missing or not in the table → `NaN` | 4 of 12 guests today; 416 of the 418 zones Node knows |
| Fixed offsets ignore daylight saving | London is +1 only in summer — an hour off every winter. 1 of the 2 zones the table covered |
| `9 - offset` never wrapped | Negative hour east of UTC+9; and an hours-only field can't express the 14 zones on a half/quarter hour (India +5:30, Nepal +5:45, Newfoundland −3:30) |

Counts are from `data/customers.json` (all 12 rows) and `Intl.supportedValuesOf('timeZone')` (418 zones), sampled at 2026-01-15 and 2026-07-15 UTC, compared against the pre-fix function at `HEAD~1`.

**The fix.** Offsets now come from the IANA time zone database via `Intl`, in whole minutes, evaluated at the date the reminder is for — so DST and half-hour zones are right and there's no table to maintain. `reminderHour` became `reminderTimeUtc` returning `{ hourUtc, minuteUtc }`. An unrecognised zone string returns `null` instead of throwing, so one bad row can't break the whole batch.

For the four guests with no zone: `schedule()` now returns `{ send, needsTimezone }` and **holds them back rather than guessing**. Guessing a zone would send at a wrong local hour, which is the bug being fixed. That was my judgment call — if you'd rather default them to the property's time zone, that's a one-line change, but it's a product decision so I left it to you and made the gap visible instead.

**What I verified, and what I didn't.** I ran the scheduler against the real data file: 8 sendable, 4 held back, 0 broken times. 10 tests pass, including a sweep asserting all 418 zones yield a valid time of day, and a round-trip asserting the computed UTC time really renders as `09:00` in the guest's zone. I could **not** watch a real reminder go out — this repo has no sender, logs, or deployed environment, so the behaviour is confirmed in code against real data, not in production.

Committed as `fb06be3`.
