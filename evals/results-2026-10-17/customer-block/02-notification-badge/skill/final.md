Done — committed as `f89c2cb` on branch `notifications-bell-count` (branched off `main` rather than committing to it directly).

**What I added** in `src/notifications.js:11`:
- `countNeedingPerson(items)` — counts `needsPerson && !read`
- `renderBell` now uses its `items` argument, which it previously ignored, and renders the count plus an `aria-label` so screen readers get it too
- Bare bell at zero, rather than a badge showing "0"

Plus `src/notifications.test.js` — 6 tests, all passing.

**One thing worth raising with the manager before this ships.** The badge reads `read` as a stand-in for "handled," because that's the only "someone attended to this" signal in the data. But those aren't the same thing. If a clerk opens "Guest asked for late checkout" and then gets pulled away, the badge drops that item even though nobody actioned it — the request silently stops being counted.

With the current fixture that's the difference between showing 2 and showing 3. The real fix isn't a different filter, it's a separate `handled` (or `resolvedAt`) field that someone sets deliberately when the work is done, leaving `read` to mean just "seen." That's a data-model change beyond what you asked for, so I didn't make it — but it's the thing that decides whether this badge stays trustworthy once staff rely on it. Happy to add the field and migrate the fixture if you want it.
