Committed on `fix-reminder-timezones` (I branched off `main` rather than committing to it directly).

## How many guests are affected

**4 of 12 are broken right now** — guests 3, 6, 9, and 12. All four have `"timezone": null` in `data/customers.json`.

There were actually two separate bugs behind the symptom:

1. **4 guests, broken today.** `reminderHour` looked the zone up in a hardcoded two-entry map (`src/timezone.js:5`). A `null` zone missed the map, so `9 - undefined` returned `NaN`. Easy to miss in logs: `JSON.stringify` renders `NaN` as `null`, which is why the schedule output looked merely empty rather than wrong.
2. **0 guests today, but a dated landmine.** `Europe/London` was pinned at `+1`, which is only right during BST. Between late October and late March those guests get reminded at 08:00 local. Nobody is in London in the current data, so this isn't part of your 4 — but it would have become a bug the moment someone signed up, and this week is exactly when the UK offset changes.

## The fix

Offsets now come from `Intl` at the actual send date instead of a static table, so DST resolves itself and new zones work without a code change. The target instant is computed in two passes, so a date straddling a DST transition still lands on 09:00 local.

For the unusable zones I had to pick a behavior, since "09:00 local" is undefined without a location. **I scheduled them at 09:00 UTC and flagged the row with `usedFallback: true`** — a reminder at a defensible hour beats a dropped one, and the flag makes the data problem visible instead of silently papering over it. If you'd rather hold those sends until someone fills in a real zone, that's a one-line change at the `schedule()` call site.

Two smaller things the rewrite picked up: a `minuteUtc` field, because half-hour zones like `Asia/Kolkata` never land on a whole UTC hour and would otherwise be rounded; and the hour is now derived from the resolved instant, so far-east zones like `+14` stay inside 0–23 instead of going negative under the old subtraction.

Tests in `test/timezone.test.js` pin both original bugs plus the edge cases; `npm test` passes 6/6.

One thing left for you: the fallback is a safety net, not a repair. Guests 3, 6, 9, and 12 still need real time zones in `data/customers.json`, and I'd check why signup let them through as `null` in the first place — a third of your guest list arriving without a time zone looks like a missing validation upstream rather than four bad records.
