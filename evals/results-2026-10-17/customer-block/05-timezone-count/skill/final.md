**4 of the 12 guests are affected** — ids 3, 6, 9, and 12. Their records have `timezone: null`, and the old code looked the zone up in a hardcoded table: `9 - undefined` → `NaN`, so those four had no valid send time at all rather than a merely mistimed one.

Your time zone hunch was right about the cause, though the mechanism is a bit worse than "wrong time" for those four. I also found a second defect in the same line that affects zero guests today but would have bitten later: the table pinned `Europe/London` to UTC+1, which is only correct in summer, so a London guest would have been an hour off every winter. Any zone outside the two-entry table would have failed exactly like the nulls.

What I changed in `src/timezone.js:9`:
- Offsets now come from the IANA database via `Intl` at the instant the reminder is due — DST and half-hour zones (Kolkata is +05:30) resolve correctly.
- The result is wrapped into a valid clock time, so negative offsets (New York) and large ones (Auckland) can't land outside 0–23.
- Minutes are reported alongside the hour, because an hour-only schedule can't express 03:30 UTC.

One judgment call worth your sign-off: for a guest with a missing or unparseable zone I **fall back to 09:00 UTC and flag `fallback: true`**, rather than skipping them or guessing from another field. That guarantees nobody gets a broken reminder, but a guest who is actually in Istanbul will hear from us at 12:00 their time — not broken, just not ideal. `guestsMissingTimezone()` lists those four so the records can be backfilled; that's the real fix for them, and it's a data task, not a code one. Say the word if you'd rather suppress the reminder entirely for unknown zones.

Added `src/timezone.test.js` — 8 tests covering DST both directions, negative and >+09:00 offsets, half-hour zones, and the null/garbage-zone fallback. All pass, and the commit is in as `2f6d531` with the customer block your project skill requires.
