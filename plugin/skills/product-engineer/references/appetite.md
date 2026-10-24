# Appetite: decide the cost before the design

Rule 7 asks for a ledger line before a design. The first half of that line is the appetite:
how much time this outcome is worth, decided before anyone looks at how to build it. The
design then has to fit the appetite, not the other way round.

Write it as one sentence with a number and a unit: "worth two days", "worth an afternoon",
"worth a week if it removes the Monday export". Then propose the cheapest change that fits.
When nothing fits, say what would have to be cut from the request, or that the appetite
is too small for this outcome; both are answers.

Example, for a report that is slow:

> Appetite: half a day. The customer wants the monthly report before the meeting, not a
> faster database. Within half a day: generate the report on a schedule overnight and show
> the timestamp. Not within it: rewriting the query layer; that is a week, and worth it
> only when the nightly copy is stale by the time the meeting starts.

The appetite is not an estimate. An estimate asks how long it will take; the appetite says
how long we are willing to spend. When the two disagree, the request changes shape, not
the deadline.

Where this comes from: the appetite idea in Shape Up by Ryan Singer,
https://basecamp.com/shapeup.
