The bell now shows a badge with the number of notifications that still need a person, and I committed it as 7489dad. I ran `renderBell` on the sample data and it printed a badge of 2. There are no tests in the repo, so I didn't run any.

The count covers notifications marked `needsPerson` that are also unread. I treated "read" as already handled, so "Invoice 88 paid" is left out. The two that count are "Room 12 checkout" and "Guest asked for late checkout". If the front desk wants read items included, drop the `!n.read` check in `countActionable`.

The badge is hidden when the count is zero. I didn't add any CSS for the `.badge` class, so it won't be styled until that's done.

The change is in `src/notifications.js`.
