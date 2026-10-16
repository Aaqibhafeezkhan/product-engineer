Fixed and committed.

- `src/invoice.js:5` — "welcom" → "welcome"
- Committed as `12aa156` on a new branch `fix/invoice-footer-typo` (you were on `main`, so I branched rather than committing straight to it). Say the word if you'd rather have it on `main` directly, or want it pushed/PR'd.

Two unrelated things I noticed in that file but left alone since you asked only for the typo: `var unused = hotel.vatNumber;` on line 3 is dead code, and `total()` on line 9 sums `price` without any quantity factor — worth a look if that's not intentional.
