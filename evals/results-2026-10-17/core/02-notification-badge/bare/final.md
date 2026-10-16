Done and committed as `a381754`.

**What changed** in `src/notifications.js:8`:
- `countNeedsPerson(items)` — new exported helper, counts `needsPerson && !read`
- `renderBell` now actually uses its `items` argument (it was ignoring it) and appends `<span class="bell-count">N</span>`, plus an `aria-label` so the number isn't visual-only
- The span is omitted entirely at zero, rather than rendering a `0`

Also added `src/notifications.test.js` — the `test` script existed but had nothing to run. 5 tests, all passing.

**One thing worth your call:** with the current fixture the bell shows **2**, not 3. `Invoice 88 paid` is flagged `needsPerson: true` but `read: true`, and I excluded it on the reading that "still needs a person" means outstanding.

That assumption is worth a second look, because *read* isn't really the same as *done* — someone can glance at a task and not do it. If the front desk's actual workflow is "mark read once handled," this is right. If they read notifications as they arrive and handle them later, the badge will under-report and the manager will trust a number that's too low. The fix is one predicate in `countNeedsPerson` — drop `&& !item.read` for a straight count of 3. Worth asking the manager which one matches how the desk works; a `handled` field separate from `read` would settle it properly if the data can grow one.
