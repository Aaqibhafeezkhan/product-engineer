I split the pricing function into one file per rule and committed it. Prices come out the same as before: a test compares the new code with the original function on 336 input combinations (3 base prices × 7 dates × 4 loyalty levels × 4 stay lengths), and all match. I ran only that test, not a real booking.

- **Rules:** `src/rules/` now has `weekend.js`, `loyalty.js`, `summer.js` and `longStay.js`. Each takes the running price and returns the new one.
- **Adding or removing a rule:** add or delete a rule file and edit one line in the list in `src/rules/index.js`. Rules run in list order, as the original did.
- **`price()`:** it now just runs the list and rounds at the end. It also accepts a custom list as an optional fourth argument, which the tests use.
- **Tests:** two more tests show that a new rule can be added and an existing one removed without touching the others.
- **README:** it now explains the add/remove steps.
- **Legacy copy:** I kept the original function as `fixtures/legacyPricing.js`, only so the comparison test has something to check against.

Not shipped: there's no config file or admin screen for rules, so marketing's changes are still code changes. That's the next step if you want non-developers to make them.
