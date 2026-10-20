I fixed the Export button for Safari and committed it as `34c903e`. I haven't run it in Safari or on an iPad.

**Cause:** `src/export.js` called `window.showSaveFilePicker`, which Safari doesn't support. On the iPads the call failed and nothing happened. Chrome has the API, so it worked there.

**Fix:** Chrome and other browsers that have `showSaveFilePicker` still get the "choose where to save" dialog. Safari now falls back to building the CSV as a Blob and downloading it as `bookings.csv` through a temporary link.

**Not checked:**
- **CSV format:** I didn't change how the CSV is built. Guest names containing commas or quotes aren't escaped, so those rows will produce a malformed CSV. That was already the case on Chrome.
- **Safari testing:** Please try Export on one of the iPads before rolling this out.
