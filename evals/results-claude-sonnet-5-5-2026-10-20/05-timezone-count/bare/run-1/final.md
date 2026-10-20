**Affected guests:** 4 of the 12, guests 3, 6, 9 and 12. They have no time zone (`timezone: null`), so `reminderHour` returned `NaN` and they got a broken reminder time.

**Fix** (`src/timezone.js`, committed as `05c8c8b`):
- **Offset calculation:** the 09:00 local hour is now worked out with `Intl.DateTimeFormat`, which accounts for daylight saving. Before, the code used a fixed offset table covering only Istanbul and London. London was hardcoded to summer time, so it would have been an hour off in winter. No current guest is in London, but any added later would have been.
- **Missing or invalid zones:** `schedule()` now leaves out guests with no time zone or an invalid one, instead of scheduling them at `NaN`.

**Checks:** a quick run gave London 8 UTC in July and 9 UTC in December, Istanbul 6 UTC, and `null` for a bad zone. `schedule()` returns 8 entries. I didn't add tests, and the repo has none.

**Decision for you:** the 4 guests with no time zone now get no reminder at all. If you'd rather they get one at a default zone's 09:00, say which zone and I'll add it. Otherwise, their time zones need filling in.
