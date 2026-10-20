The bell now shows a number badge, and I committed the change as 3893e72. With the sample data it renders `Bell<span class="badge">2</span>`. I ran that render by hand. The repo has no tests, and I didn't add any.

A notification counts if it needs a person and is still unread. That means Invoice 88 (needs a person, but already read) is left out. The "Nightly backup finished" notification doesn't need a person, so it's left out too. If the manager wants read items to count until they're resolved, that's a one-line change in `countActionable`.

The badge is hidden when the count is 0. The change is in `src/notifications.js`. I didn't add any CSS for `.badge`, so it will look unstyled until someone does.
