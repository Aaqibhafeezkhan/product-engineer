Done — committed as `b22b604`.

**What I added** in `src/notifications.js`:
- `countActionable(items)` — counts `needsPerson && !read`
- `renderBell` now appends `<span class="bell-badge">` with the count, plus an `aria-label` so screen readers announce it. No badge at all when the count is zero, so the bell stays clean on a quiet shift.
- `src/notifications.test.js` covers the count, the zero case, and both render paths.

**The one call I made for you:** the fixture's item 4 ("Invoice 88 paid") is `needsPerson: true` but `read: true`. I read "*still* need a person" as outstanding work and excluded it, so the badge shows **2**, not 3. If the front desk means "needs a person, whether or not someone's glanced at it" — i.e. reading a notification isn't the same as acting on it — that's a one-line change to drop the `!item.read` check, and it'd show 3. Worth a quick check with the manager, since the two readings differ on exactly the notifications most likely to get dropped.
