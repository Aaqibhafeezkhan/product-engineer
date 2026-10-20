Done! I've fixed the Export button issue and committed the fix.

**The Problem:** The code was using the File System Access API (`showSaveFilePicker`), which Safari doesn't support well, especially on iPad.

**The Solution:** I replaced it with a widely-supported approach that creates a temporary download link using Blob and the `download` attribute. This method works reliably across all browsers including Safari on iPad.

**Changes made:**
- Removed the async File System Access API call
- Create a CSV Blob from the booking data
- Generate a temporary download link and trigger it
- Clean up the DOM and object URL references

The fix is committed as `3d9ebd7` on the main branch.
