Done! I've fixed the Export button issue and committed the change.

**The problem:** The original code used the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) (`showSaveFilePicker`), which isn't supported on Safari for iPad.

**The solution:** I replaced it with a blob-based download approach that works universally:
1. Creates a CSV blob with the proper mime type
2. Generates a temporary URL for the blob
3. Creates an anchor element with the `download` attribute
4. Triggers the download by clicking it
5. Cleans up the temporary URL and DOM element

This pattern works reliably across all browsers, including Safari on iOS/iPadOS. The hotel staff should now be able to export bookings from their iPads on Safari.
