I fixed the Export button for Safari and committed it as `248e8e6`. I haven't run it on an iPad or in Safari.

**Cause:** `src/export.js` called `window.showSaveFilePicker`, which Safari doesn't support. The call threw an error, so the button did nothing.

**Fix:** `exportBookings` still uses the save-file picker when the browser has it, so Chrome behaves as before. Otherwise it builds a CSV blob and downloads it as `bookings.csv`. On iPad Safari the file should go to Downloads or show the share prompt.

If the user cancels Chrome's save dialog, that still throws an `AbortError`. I didn't change this.
