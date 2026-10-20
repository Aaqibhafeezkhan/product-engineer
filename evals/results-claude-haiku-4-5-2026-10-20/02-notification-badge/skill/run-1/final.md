Done! I've added a notification counter badge to the bell that shows the number of unread notifications needing action. The counter counts notifications where `needsPerson: true` and `read: false`, so the front desk manager can see at a glance how many items require their attention. With the current test data, it would show 2 notifications (the checkout and late checkout requests).

The change has been committed as `c5649d2`.
