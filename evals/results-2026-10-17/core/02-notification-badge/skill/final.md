Done — committed as `354f354` on a new branch `bell-needs-person-count`.

**What changed** — `src/notifications.js:8`: `renderBell` now counts items marked `needsPerson` and renders `<span class="bell-count">` with the number plus an `aria-label` so it's announced to screen readers. No badge renders when the count is zero, and a missing list gives the plain bell instead of throwing. Added `src/notifications.test.js` (7 tests, all passing).

**The one decision worth your manager's attention:** a notification that's been *read* still counts. With the current fixture that makes the bell read **3**, not 2:

| | |
|---|---|
| Room 12 checkout | counts |
| Nightly backup finished | excluded — system handled it |
| Guest asked for late checkout | counts |
| Invoice 88 paid *(already read)* | counts |

I went this way because `read` records that someone *saw* an item, not that the work got done, and the data has no `done`/`handled` field. If read items dropped off, anyone clicking through the menu would empty the bell without doing a thing. Worth confirming with the front desk manager, though — if they consider "read" to mean "dealt with", it's a one-line change to `countNeedingPerson`. Separately, `Invoice 88 paid` being flagged as needing a person looks like it might be a data question on their side rather than a display one.

**Observed vs. not:** I ran the renderer and read the actual HTML it produces, and confirmed the per-row breakdown above by counting the fixture, not from memory. I could not open it in a real browser or on a device — so the badge's visual placement and sizing against the bell icon is unverified, and that's the check I'd want before this goes in front of reception.

Two things I deliberately left out, both recorded in the commit under `Not shipped`: a `9+` style cap for large counts, and any way to mark an item handled (nothing in the data supports it yet).
