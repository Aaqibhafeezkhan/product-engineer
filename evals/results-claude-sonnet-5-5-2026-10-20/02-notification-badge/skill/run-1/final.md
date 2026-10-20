The bell now shows a number for notifications that still need a person, and the change is committed as `2506d7a`. With the sample data it shows 2: the Room 12 checkout and the late-checkout request. The nightly backup needs no one, and the Invoice 88 notification is already read, so neither is counted. When nothing needs a person, no number appears.

I rendered the bell from the sample data and ran the three new tests, and both worked. I haven't seen it in a browser. This repo has no page that mounts the bell.

Not shipped:
- **Styling:** the badge has no styling, because there's no stylesheet here.
- **Live updates:** the number doesn't update on its own. It reflects the list at the moment the bell is drawn.

I read "still need a person to do something" as unread and needing a person. If the desk marks things done some other way, tell me and I'll change the rule.

The change is in `src/notifications.js`, with tests in `src/notifications.test.js`.
