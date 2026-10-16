**4 guests are affected** — ids 3, 6, 9, and 12. All four have `timezone: null` in `data/customers.json`.

The cause wasn't a wrong time zone, it was a missing one. `reminderHour` looked the zone up in a hardcoded two-entry table (`src/timezone.js:5`), so a null zone gave `offset === undefined` and `9 - undefined` → `NaN`. Those guests were scheduled at hour `NaN`, not at a shifted hour.

While in there I found two more latent faults in the same table, neither visible in today's data but both live:

- `Europe/London` was pinned to `+1` year-round. That's only true under BST — it breaks in 8 days, at the Oct 25 switch.
- `9 - offset` goes negative for zones east of +09:00 (Auckland would have been `-4`).

So instead of patching the null case I replaced the table with offsets read from the IANA database via `Intl`, for the specific day being scheduled. Unknown or missing zones fall back to 09:00 UTC and are flagged on the row as `usesFallbackTimezone`.

Watched: ran `schedule()` for today and printed all 12 rows — 0 broken, the 8 Istanbul guests at 06:00 UTC, the 4 fallback guests at 09:00 UTC and flagged. Swept all 365 days of 2026: 0 broken guest-days. Stepped London across the Oct 25 BST→GMT boundary and saw it move 8→9 UTC, where the old code would have stayed at 8. Failure path tried directly: `null`, `undefined`, `""`, `"Not/AZone"` and `{}` all return 9 rather than `NaN`. 4 tests pass in `src/timezone.test.js`.

Could not check: anything downstream of this module — there's no sender, scheduler, or log in this repo, only `reminderHour`/`schedule`, so I confirmed the hours are correct but never saw a reminder actually dispatch. Nothing deployed, so no production or staging observation.

One decision worth your call: **09:00 UTC for those 4 guests is a guess, not a fix for them.** Their reminder is no longer broken, but if a guest is actually in Istanbul it reaches them at noon. The real repair is backfilling the time zone in `data/customers.json` — I left `usesFallbackTimezone` on the row so you can find them. Want me to drop the reminder for unknown-zone guests instead of guessing, or hold until the data's backfilled?
