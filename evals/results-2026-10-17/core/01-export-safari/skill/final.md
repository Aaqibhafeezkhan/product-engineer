Committed as `c414bbf` on branch `fix-safari-csv-export`.

## What was wrong

`src/export.js` called `window.showSaveFilePicker` unconditionally. That's the File System Access API, which only Chromium browsers implement. On an iPad it's `undefined`, so the call threw inside an `async` function and the rejected promise went unhandled — no file, no error message. That silent rejection is precisely the "does nothing" the staff reported, and it's why Chrome was fine.

## The fix

Feature-detect the picker; when it's absent, hand the CSV to the browser's own download mechanism via a temporary object-URL link, which Safari does support. Chrome still gets the folder picker, so nobody loses the ability to choose where the file goes. Two small details the fallback needs: the link has to be in the document for Safari to follow the click, and the object URL is revoked on a timer so revocation doesn't cancel the download in flight.

I also added `src/export.test.js` — the repo had a `test` script but no tests, and otherwise there'd be nothing exercising the new branch. Both paths pass: no picker → one download click carrying a `text/csv` blob with the expected rows; picker present → picker used, no link created.

## What I could not check

**I have not seen this work on an iPad.** This repo is one module — no UI, no app to launch — so I can't reproduce the reported device here, and a green test is not the same as watching it behave. Worth one tap at a reception desk on either hotel's iPad before you close the ticket. That's the only remaining gap I'd flag.

## Deliberately not fixed

CSV values are still joined with bare commas and no quoting, so **a guest name containing a comma or a quote mark still breaks its row** — on Safari and Chrome equally. It's a real defect and it'll corrupt an export the first time someone books under "Alvarez, Jr." It's also a different bug from the one reported, so I left it out rather than widen this fix. Say the word and I'll do it as its own change.

Two notes on process: I branched rather than committing straight to `main`, so merge when you're ready. And I couldn't confirm the browser support matrix against a live source — the web search needed a permission I don't have — but the fix doesn't rest on that: it's feature-detected, so if Safari ever ships the API, the picker path starts being used on its own.
