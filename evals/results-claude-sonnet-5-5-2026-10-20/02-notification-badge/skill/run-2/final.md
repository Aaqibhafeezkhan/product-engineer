The bell now shows a number for notifications that still need a person, and I committed it as `3c46fc7`. I haven't seen it in a real browser or the real menu.

- **What it counts:** unread notifications flagged as needing a person. I treated "read" as "handled", because the data has no separate done state. If reception wants "handled" to mean something else, that's a small change.
- **Zero case:** with nothing waiting, no number appears.
- **What I checked:** I rendered the bell from the sample data and the badge showed 2. Those two are "Room 12 checkout" and "Guest asked for late checkout". The paid invoice (already read) and the nightly backup (needs no one) aren't counted. The three tests I added also pass.
- **Not done:** the badge is plain markup (`<span class="badge">`). There's no CSS for it yet, so it won't look like a badge until it's styled.

The change is in `src/notifications.js`, with the tests in `src/notifications.test.js`.
