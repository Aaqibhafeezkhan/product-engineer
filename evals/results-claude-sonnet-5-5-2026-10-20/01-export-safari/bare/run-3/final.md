I fixed the Export button and committed the change (`f33106d`). I haven't run it in Safari or on an iPad, and the repo has no tests, so it's untested.

**Cause:** `src/export.js` only used `window.showSaveFilePicker`, which Chrome has and Safari doesn't. On Safari the call threw an error, so the button seemed to do nothing.

**Fix:** The export still uses the save dialog where it exists, so Chrome behaves as before. Where it doesn't exist, it now builds the CSV as a file in the browser and downloads it as `bookings.csv`.

On iPad Safari the file goes to the Downloads folder, and there's no dialog asking where to save it. Staff may need to look in the Downloads icon in Safari's toolbar.

I left two things alone. The CSV doesn't quote fields, so a guest name containing a comma will break that row. There's also no header row.
