# Done means observed

Tick what you did. Say which boxes you could not tick and why. Never say "done" with an
empty list.

- [ ] I watched the change behave in production logs, or in the environment closest to it.
- [ ] I looked at the data it wrote (a row, a document, a file), not only the response code.
- [ ] I tried it on a real device or browser when the change is visible to a person.
- [ ] I tried the failure path once (bad input, timeout, missing permission).
- [ ] The customer-facing text was read by someone who did not write it, or I read it aloud.
- [ ] The "For the customer" block is in the commit and the PR.
- [ ] Anything I deliberately did not do is under "Not shipped" with a reason.
- [ ] One sentence on what I would do differently next time (the lean habit of hansei, https://www.lean.org/lexicon-terms/hansei/).

Tests passing is the entry ticket to this list, not an item on it.
