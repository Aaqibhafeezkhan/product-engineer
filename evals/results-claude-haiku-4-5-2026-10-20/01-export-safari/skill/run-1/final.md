Done! I've fixed the Export button issue and committed the fix. 

**The problem:** The code was using the File System Access API (`showSaveFilePicker`), which isn't supported on Safari, especially on iPad.

**The solution:** I replaced it with a universally-compatible blob download approach that:
- Creates a CSV blob from the data
- Generates a temporary download link
- Simulates a click to trigger the download
- Cleans up resources afterward

This method works across all browsers including Safari on iPad. The reception staff should now be able to export bookings successfully from both Safari and Chrome.
