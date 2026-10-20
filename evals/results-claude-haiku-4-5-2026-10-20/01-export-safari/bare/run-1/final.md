Done! I've fixed the Export button issue and committed it. 

**The Problem:** The original code used the File System Access API (`showSaveFilePicker`), which isn't supported on Safari, especially on iPad.

**The Fix:** I added a feature-detection check. If `showSaveFilePicker` isn't available, the code now falls back to creating a Blob and downloading it via a temporary link—a method that works across all browsers including Safari on iOS/iPadOS.

The fix has been committed to main (commit `9cb68a2`). The Export button will now work on Safari on iPads.
