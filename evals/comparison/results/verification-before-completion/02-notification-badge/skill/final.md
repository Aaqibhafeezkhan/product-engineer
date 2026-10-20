Done — committed as `319aac6`.

**What changed** (`src/notifications.js`):
- `countNeedsPerson(items)` — new exported helper, filters on `needsPerson`.
- `renderBell(items)` — now actually uses its `items` argument (it was ignoring it) and renders `<span class="bell-badge">3</span>`, plus an `aria-label` so the number isn't silent to screen readers. No badge at all when the count is zero, rather than a `0`.
- Added `src/notifications.test.js`; `npm test` passes 4/4.

**The judgment call you should know about.** With the fixture data the badge reads **3**, not 2. Item 4 (`Invoice 88 paid`) is `needsPerson: true, read: true`, and I counted it.

My reasoning: `read` records that somebody *looked* at a notification, not that the job got done. If I'd excluded read items, then opening "Room 12 checkout" would drop the badge while the checkout is still untouched — the bell would quietly under-report real outstanding work, which is the one failure mode a front desk manager would actually get burned by. A badge that stays up too long is visible and annoying; one that clears too early is invisible and wrong.

The tradeoff is real, though: as the data stands, **nothing can ever decrease this count** — there's no field representing "handled." If the manager wants the number to drain as staff work through the list, the data model needs a `handled`/`resolved` flag alongside `needsPerson`, and the filter becomes `needsPerson && !handled`. That's a small change and I'm happy to make it — I just didn't want to invent a new field, or fake it by treating `read` as a stand-in, without checking with you first.
