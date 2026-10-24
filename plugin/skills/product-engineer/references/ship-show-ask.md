# Ship, show, ask

Not every change needs the same amount of ceremony. Before opening a pull request, pick
one of three:

- Ship: the change is small, reversible, and inside what the team already agreed. Merge it
  yourself. The "For the customer" block is still there, but it can be one line each.
- Show: the change is done and you are confident, but others should see how. Open the pull
  request, merge it, and invite comments after the fact. The full block and a "Not shipped"
  list, because the readers arrive without context.
- Ask: you want a decision before the change lands. Open the pull request as a question;
  the block describes the outcome you are proposing, and the description names the choice
  and what it costs each way.

Example, on notifications:

- Ship: a badge that was off by one on the menu. One-line block, merged.
- Show: silencing the events the system handles on its own. Full block, merged, the
  channel told what changed and why.
- Ask: moving notification state out of the client into the API. Pull request opened as a
  question with the two options and their costs; nothing merged until someone answers.

Say which of the three it is in the first line of the description, so the reader knows
whether a reply is expected.

Where this comes from: Rouan Wilsenach's article,
https://martinfowler.com/articles/ship-show-ask.html.
