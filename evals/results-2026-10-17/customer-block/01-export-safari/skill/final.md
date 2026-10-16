Fixed and committed.

**The cause:** `src/export.js` used `window.showSaveFilePicker` — the File System Access API, which only Chromium ships. On Safari that property is `undefined`, so calling it threw a `TypeError` on the very first step, before any CSV was written. Nothing caught the error, so the button looked completely inert. That's exactly the Chrome-works/Safari-doesn't split the staff reported.

**The fix** (`src/export.js`): feature-detect the picker, and otherwise write the file through a `Blob` object URL and an anchor download, which Safari supports. Three smaller things came along with it, each one needed to make that path actually work:

- The anchor is appended to the document before clicking — Safari ignores the click otherwise.
- The object URL is revoked on a timer, not immediately; a synchronous revoke cancels the in-flight download in Safari.
- The Blob is tagged `charset=utf-8`, so accented guest names don't get mangled.

I also made a dismissed save dialog (`AbortError`) return quietly on the Chrome path, since cancelling isn't a failure — but real errors still propagate.

**Verification:** there's no test setup in this repo (`npm test` runs `node --test` with no test files) and no DOM, so I exercised the module directly against stubbed browser globals, covering four cases: Safari with no picker, Chrome with the picker, Chrome with the user cancelling, and Chrome with a genuine write error. All behaved correctly, and both paths produce byte-identical CSV. That's a scratch harness I ran and deleted, not committed — worth knowing that **the fix has not been confirmed on a real iPad**, and the three Safari behaviours above are the kind of thing only a real device fully settles. A quick check with one of the reception staff would close that out.

Two notes on what I did *not* change, since both are judgement calls that are yours:

- I committed to a new branch, `fix/safari-safari-export` — actually `fix/safari-csv-export` — rather than straight to `main`, and did not push. Say the word if you'd rather it land on `main`.
- The CSV has no field escaping: a guest name containing a comma or quote will still break the row, on every browser. That's a real bug but a separate one from what the staff hit, so I left it alone. Happy to fix it next if you want.
