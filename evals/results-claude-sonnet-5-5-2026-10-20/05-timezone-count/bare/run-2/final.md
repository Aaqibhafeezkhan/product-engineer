**4 of the 12 guests are affected** (IDs 3, 6, 9 and 12). They have no time zone on file. The old code looked up their offset, got `undefined`, and produced `NaN` as the send hour, so their reminders were broken.

I also found a second bug that affects no guest today. London was hard-coded to a +1 offset, which is only right in summer. After the clocks change on 25 Oct 2026, any London guest would have been reminded an hour off.

**The fix** is in `src/timezone.js`:
- **Offsets:** they are now computed from the guest's actual time zone at the send date, so daylight saving is handled and no zones are hard-coded.
- **Missing or invalid time zones:** these guests are left out of the schedule, so nobody gets a reminder at a wrong time.

**Checks:** I ran it by hand rather than adding tests. It schedules 8 guests. Istanbul guests get 06:00 UTC. London guests get 09:00 UTC in winter and 08:00 UTC in summer.

**Commits:** I committed as `1ea1f81` and `a5f7d0e`. The second one fixes a small rounding error I introduced in the first.

**Decision for you:** the four guests with no time zone currently get no reminder at all. If you'd rather they get one at a default time, or you can fill in their time zones, tell me and I'll change it.
