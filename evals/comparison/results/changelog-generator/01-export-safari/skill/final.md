Fixed and committed on branch `fix-safari-csv-export`.

**Cause:** `src/export.js:5` called `window.showSaveFilePicker()`, part of the File System Access API. Safari doesn't implement it — on desktop or iPadOS — so the property is `undefined` and the call threw `TypeError: window.showSaveFilePicker is not a function`. Since `exportBookings` is `async`, that became a rejected promise rather than a visible error, so with nothing handling it the button appeared to do nothing. Chrome implements the API, which is why it worked there.

**Fix:** feature-detect the picker, and fall back to a Blob plus a `<a download>` click, which Safari does support. Two Safari-specific details in the fallback: the link has to be in the document when clicked, and the object URL can't be revoked synchronously or Safari cancels the download.

I kept the picker on Chrome rather than switching everyone to the fallback, so Chrome users don't lose the "choose where to save" dialog they have today. One side effect worth knowing: on Safari the file now lands in the normal Downloads location with no prompt — on an iPad that's the Files app, not a location staff choose.

I also added `src/export.test.js` covering both browser paths, plus a dismissed-picker case I noticed while fixing: the old `await` had no error handling, so a user cancelling the Chrome dialog would have fallen through to an unwanted download once a fallback existed. All three tests pass, and I verified two of them fail against the pre-fix code with that exact TypeError, so they genuinely pin the bug.

Two things I left alone as outside this fix, both worth a follow-up:

- **The CSV isn't escaped.** `line 3` joins fields with commas and no quoting, so a guest name containing a comma — "Smith, John" — silently shifts every later column in that row. This affects Chrome too.
- **Nothing surfaces export failures to the user.** The caller clearly isn't catching rejections, which is why this presented as silence rather than an error message. Worth a toast on failure so the next breakage isn't invisible.

I can't verify this on a real iPad from here; the evidence is the API-support reason plus the stubbed tests. Confirming with one of the reception staff on the actual device would close it out.
