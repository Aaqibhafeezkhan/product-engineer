Done! I've fixed the Export button issue. The problem was that the code used the File System Access API (`showSaveFilePicker`), which isn't supported on Safari (including iPad Safari).

**The fix:**
- Replaced the unsupported API with a standard blob-based download using `URL.createObjectURL()`
- This approach works across all browsers, including Safari on iPad
- Also changed from async to sync since no awaits are needed with this method

The commit has been created with the fix applied.
