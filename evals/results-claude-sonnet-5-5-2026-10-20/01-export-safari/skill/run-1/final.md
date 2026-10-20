I fixed the Export button for Safari and committed it (`686ef23`). I haven't tried it on a real iPad.

**Cause:** `src/export.js` used `window.showSaveFilePicker`, which Chrome has and Safari doesn't. On Safari the call threw an error, so the button appeared to do nothing.

**Fix:** The export still uses the save picker where the browser has it, so Chrome behaves as before. Where the picker is missing, it downloads `bookings.csv` through a temporary link instead.

**Tests:** I added `src/export.test.js`, which covers both paths with a simulated browser. Both tests pass, but they don't prove Safari itself works.

Please have someone at one of the hotels tap Export on an iPad. Safari should save the file to Downloads or show its download prompt. It won't ask where to save, because Safari can't do that.

I didn't touch the CSV building. Guest names containing commas or quotes will produce a malformed CSV, in Chrome too. That's a separate fix if you want it.
