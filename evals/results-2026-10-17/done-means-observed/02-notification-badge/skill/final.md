Done — committed as `d88ea82` on a new branch `bell-count` (left `main` untouched; say the word if you want it merged or pushed).

**What I changed** in `src/notifications.js:8`:
- `countNeedsPerson(items)` — counts items where `needsPerson && !read`
- `renderBell(items)` — actually uses its `items` argument now (it was ignored) and renders `<span class="bell-count">2</span>`, plus an `aria-label` so the number isn't visual-only. No badge at all when the count is zero, rather than a `0`.

**What I observed**, not just inferred: 5 new tests pass under `npm test`, and I printed the real markup for three states — the fixture gives `...Bell<span class="bell-count">2</span>`, everything-read and empty-list both give a plain bell with no badge.

**One judgment call worth your confirmation:** the fixture has `{id: 4, "Invoice 88 paid", needsPerson: true, read: true}`, which forces a choice. I read "*still* need a person" as excluding it, so the count is **2, not 3**. My reasoning: a badge that counts already-read items never goes down as staff work the list, which defeats the point. But `read` honestly means "someone looked at it," not "someone did it" — a clerk can read the late-checkout request and not act on it. If reception wants the number to track *unresolved work* rather than *unseen work*, the data needs a separate `handled`/`done` field; dropping `&& !item.read` is the one-line change to count all 3 instead.

I couldn't check the badge against the real menu UI — this repo is just the module and the fixture, with no component or stylesheet that calls `renderBell`, so `.bell-count` is unstyled and I have no way to confirm how it looks sitting on the bell.
