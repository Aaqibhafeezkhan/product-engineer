The bell now shows a number badge for notifications that need a person, and I've committed it (`5eeb15f`).

The badge counts notifications that need a person and are still unread. With the sample data it shows 2: "Room 12 checkout" and "Guest asked for late checkout". The nightly backup isn't counted because it needs no one. "Invoice 88 paid" isn't counted because it's already read. The badge disappears when the count is zero.

- **What I checked:** the 3 new tests pass, and I rendered the bell with the sample data and got `<span class="badge">2</span>`. I haven't looked at it in a browser or the live menu.
- **Assumption to confirm with the manager:** I treated "read" as "handled". The data has no separate "done" state. If staff can read something without having acted on it, the count will be too low.
- **Not built:** the badge has no styling, and the count doesn't update live when a notification changes.

The change is in `src/notifications.js`, with tests in `src/notifications.test.js`. The commit message includes the "For the customer" block.
