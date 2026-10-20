I fixed the Export button and committed it (`78ceebf`), but I haven't run it on an iPad or in any browser, so it's untested.

**Cause:** the export in `src/export.js` used `window.showSaveFilePicker`, which Chrome has and Safari doesn't. On Safari the call threw an error, so the button appeared to do nothing.

**Fix:** if `showSaveFilePicker` exists, Chrome behaves as before and asks where to save. Otherwise the CSV is downloaded as `bookings.csv` through a normal download link. On iPad Safari the file goes to the Downloads folder instead of showing a save dialog.

Please try the button on an iPad before you tell the hotels it's fixed.

**Not changed:** guest names or other fields containing a comma or quote aren't escaped in the CSV, so those rows will split into extra columns when opened in a spreadsheet. That happens in Chrome too. I can fix it if you want.
