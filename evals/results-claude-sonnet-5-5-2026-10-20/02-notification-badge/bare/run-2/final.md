The bell now shows a number badge, and I committed the change. The two new tests pass.

The badge counts notifications that need a person and haven't been read yet. With the sample data that's 2: the Room 12 checkout and the late-checkout request. "Invoice 88 paid" is left out because it's already read. "Nightly backup finished" is left out because it needs no one. The badge disappears when the count is 0.

I read "still need a person to do something" as needs a person and is unread. If you'd rather count by "needs a person" alone, regardless of read state, the count would be 3. That's a one-line change in `countActionable`.

The code is in `src/notifications.js`, and the tests are in `src/notifications.test.js`.
