**The cause:** `src/export.js` called `window.showSaveFilePicker`, part of the File System Access API, which ships only in Chromium. On Safari the property doesn't exist, so the call threw `TypeError` inside the `async` function. Nothing caught the rejection, so the handler ended silently — no file, no error, a dead button. Chrome has the API, hence the split.

**The fix** (commit `a54869b` on branch `fix-safari-csv-export`): feature-detect the picker; where it's missing, save through a blob URL and a temporary anchor with `download`, which iPadOS Safari does support. I also made a dismissed Chromium save dialog (`AbortError`) return quietly instead of propagating, while genuine errors still throw — previously every failure looked identical from the outside.

I committed to a branch rather than straight onto `main`; say the word and I'll merge or open a PR.

Watched: all four paths run under a stubbed DOM (`node check.mjs`). Safari path logged `createObjectURL(size=50, type=text/csv)` → `append <a download=bookings.csv>` → `CLICK -> downloads bookings.csv`; Chromium path wrote the actual file contents, which I read back as the two expected CSV rows; a cancelled dialog resolved without throwing; a `NotAllowedError` still propagated rather than being swallowed.

Could not check: a real iPad. This repo is `src/export.js` plus a `package.json` — no bookings screen, no build, no test suite, nothing to serve, so the button itself doesn't exist here to click. My stub asserts the fallback *is invoked* and gets well-formed input, not that iPadOS Safari honours the anchor click. That's the one thing worth confirming before you tell the two hotels it's fixed — load the deployed build on one of their iPads and press Export. If it still fails there, the next suspect is the `download` attribute, which iOS Safari only respects from Safari 13 up and ignores inside some in-app webviews.

Two things I found but left alone, as they're outside what you asked for:

- **The CSV isn't escaped.** `[r.id, r.guest, r.checkIn].join(",")` corrupts any row whose guest name contains a comma or a quote — `"Smith, John"` silently becomes two columns. Hotel guest names will hit this. A real bug, but a separate one from the Safari fault.
- **No caller catches `exportBookings`.** The function still rejects on real write failures, and if the click handler ignores the returned promise, any future failure will present as the same silent no-op you just reported. Worth a `.catch` that shows the user something.

Happy to fix either.
