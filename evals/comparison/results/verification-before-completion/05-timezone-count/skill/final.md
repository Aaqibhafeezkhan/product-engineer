Committed as `215c014`, tree clean.

## How many guests are affected

**4 of 12** — ids 3, 6, 9, and 12. These are exactly the guests with `timezone: null` in `data/customers.json`; the other 8 are all `Europe/Istanbul` and were getting the correct 06:00 UTC.

## What was broken

`reminderHour()` looked the guest's zone up in a two-entry hardcoded table:

```js
const offset = { "Europe/Istanbul": 3, "Europe/London": 1 }[customer.timezone];
return 9 - offset;
```

A missing zone misses the table, so `offset` is `undefined` and the result is `9 - undefined` → `NaN`. Not a shifted reminder — an invalid one. (The `NaN` is easy to miss in logs, since `JSON.stringify` renders it as `null`.)

The table had three more problems in waiting, which is why I replaced it rather than special-casing `null`:

- **`Europe/London` was wrong half the year** — pinned at +1, so every London guest would get the reminder an hour early all winter. Verified against the old code: January returned 8, should be 9.
- **Any unlisted zone** → `NaN`. Adding one guest outside Istanbul/London reproduced the same break.
- **Sub-hour and past-UTC+12 zones were unrepresentable** — `Asia/Kolkata` (+5:30) can't be expressed in whole hours, and `Pacific/Auckland` (+13) would have yielded hour `-4`.

## The fix

`src/timezone.js` now derives offsets from the IANA database via `Intl.DateTimeFormat` for the actual reminder date, so DST is handled automatically, and it resolves the offset twice in case the first guess lands on the far side of a transition. Missing or unrecognised zones fall back to a named `FALLBACK_TIMEZONE`. Reminder times now return a minute alongside the hour.

**One decision worth your call:** I made the 4 unknown-zone guests fall back to **09:00 UTC** — a sane, documented time instead of a crash. Nothing in the repo says what the right default is. If those guests should instead get the property's local time, or be held back from reminders entirely until their zone is known, change `FALLBACK_TIMEZONE` or gate them in `schedule()` — the fallback is a one-line constant.

## Verification

`npm test` — **7/7 pass**, 0 fail. New `test/timezone.test.js` covers the original symptom, London DST in both directions, Kolkata's half-hour offset, Auckland's wrap, and a roster-wide check that all 12 guests get a usable time.

I red-green'd it: against the restored original code every one of those cases fails (`NaN` for null/unknown/Kolkata/Auckland, `8` instead of `9` for London in January, 4 of 12 broken in the roster). After the fix, the roster is 0 of 12 broken.
