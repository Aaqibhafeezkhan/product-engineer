Fixed and committed.

- `src/invoice.js:5` — "welcom" → "welcome"
- Committed as `01f6294` on a new branch `fix-invoice-footer-typo` (you were on `main`, so I branched rather than committing straight to it — say the word if you'd rather have it on `main`).
- The commit message carries the "For the customer" block, per the `customer-block` skill in this repo.

Two unrelated things I noticed in that file but left alone: an unused `var unused = hotel.vatNumber;` on line 3, and the `TODO` about moving the file to the template engine. Happy to clean up the unused variable separately if you want.
