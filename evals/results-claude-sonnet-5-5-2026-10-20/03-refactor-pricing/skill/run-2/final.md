I split the pricing function into one file per rule and committed it as `b26a505`. The tests pass, and prices come out the same as before.

- **Rules:** weekend, loyalty, summer and long-stay each have their own file in `src/rules/`.
- **Rule list:** `src/rules/index.js` lists the rules in the same order the old function applied them.
- **`price()`:** it now just runs the list in order and rounds the result.
- **Adding a rule:** create a file in `src/rules/` and add one line to `index.js`.
- **Removing a rule:** delete its line from `index.js`.
- **Docs:** the README explains how to add or remove a rule.

I compared the new code against a copy of the old function in `test/pricing.test.js`. The check covers 4 base prices, every month, days 1–28, 4 loyalty values and 4 stay lengths, and every result matched. I also added tests for each rule on its own and for adding a made-up rule. I only ran the test suite and did not run it against real bookings.

I did not build a way for marketing to change rules without a developer, such as a config file or admin screen. Each change is still a small code change. Date-limited promotions are also not built.
