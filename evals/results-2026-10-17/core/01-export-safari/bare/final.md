Fixed and committed as `32ceec0`.

**The bug:** `src/export.js` called `window.showSaveFilePicker()` unconditionally. That's the File System Access API, which only Chromium ships. On Safari it's `undefined`, so `await`ing it throws a `TypeError` immediately; since nothing handles the rejected promise, the click produces no file and no visible error. That's precisely "works on Chrome, does nothing on Safari."

**The fix:** feature-detect the picker. Chrome keeps the save-location dialog staff are used to; Safari falls back to a `Blob` + `<a download>` link, which iPadOS has supported since iOS 13. I also made a dismissed save dialog (`AbortError`) a clean no-op instead of a thrown error — previously cancelling the Chrome dialog also produced an unhandled rejection.

I added `test/export.test.js` covering both browser paths and the cancel case, since neither of us can exercise an actual iPad here. All three pass.

Two things worth flagging that I left alone as outside this report:

- **CSV fields aren't escaped** (`src/export.js:3`). A guest name containing a comma or quote — "Smith, Jr." — will shift columns in the exported file. This is a live data-corruption bug that staff would likely read as "the export is wrong" rather than "the export is broken," so it may not have been reported. Worth a separate fix; say the word and I'll do it.
- **Verification on a real device.** The fallback is the standard approach and the logic is tested, but I'd still have one of the two hotels click Export on an iPad before you consider this closed — my tests stub the DOM, so they prove the code takes the right path, not that iPadOS Safari renders the download as expected.
