I fixed the Export button and committed it, but I haven't run it on an iPad or in Safari, so it's untested. The repo has no tests or browser setup.

**Cause:** `src/export.js` saved the file with `window.showSaveFilePicker`. Safari doesn't have that function, so the call threw an error and nothing happened. Chrome has it, which is why it worked there.

**Fix:** The code now checks whether `showSaveFilePicker` exists. Chrome still shows the "choose where to save" dialog. Where it's missing, as on Safari, the CSV downloads as `bookings.csv` through a normal download link.

On an iPad, the file should land in Safari's Downloads. Please have someone at one of the hotels press Export on an iPad to confirm.

The commit is `3be298a`.
