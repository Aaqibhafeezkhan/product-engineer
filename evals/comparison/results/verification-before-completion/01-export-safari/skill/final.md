Fixed and committed as `c761da5`.

**What was wrong:** `src/export.js` called `window.showSaveFilePicker` unconditionally. That's the File System Access API, which only Chromium browsers implement. On Safari the property doesn't exist, so the call threw `TypeError: window.showSaveFilePicker is not a function` on the first line that mattered. Because nothing caught the rejected promise, there was no error dialog and no console-visible failure to reception staff — the button just did nothing. Chrome worked because it has the API.

**The fix:** feature-detect `showSaveFilePicker` and fall back to the portable approach — a Blob object URL on an anchor with a `download` attribute, which Safari on iPadOS supports. Two Safari-specific details are handled deliberately and noted in comments: the fallback doesn't `await` anything before `.click()`, because Safari only honours a programmatic download while still inside the task started by the user's tap; and the anchor is attached to the document, because Safari ignores `download` on a detached element. Chrome keeps the nicer "pick where to save" flow.

I also made a dismissed save dialog stop counting as a failure — on the Chrome path it rejected with `AbortError` and produced the same silent unhandled rejection. Genuine errors still propagate.

**Verification:** added `src/export.test.js` (5 tests) and ran a red-green check. With the original `showSaveFilePicker` logic restored, the Safari test fails with exactly the reported symptom (`TypeError: window.showSaveFilePicker is not a function`); with the fix in place the suite is 5/5 passing.

Two things to flag, both outside what I changed:

- **Not verified on a real iPad.** The tests use stubbed browser objects, which proves the code takes the fallback path and triggers a download, but not that iPadOS Safari renders it as expected. Worth one confirmation from either hotel before you close the ticket.
- **A separate pre-existing bug in the CSV itself.** `toCsv` joins fields with commas and no quoting or escaping, so any guest name containing a comma (`"Smith, John"`) silently shifts every following column in that row. I left it alone since it's unrelated to the Safari report and affects Chrome equally, but it's a real data-corruption bug and a good next ticket.
