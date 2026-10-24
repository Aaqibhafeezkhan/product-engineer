# The press release before the code

Rule 1 asks for one sentence of customer outcome. When the work is bigger than a commit,
write the sentence as the first paragraph of the announcement you would send the day it
ships. If that paragraph is hard to write, the work is not understood yet.

The paragraph has four parts: who it is for, what they can do now, what they did before,
and how they will notice. Nothing about the implementation.

Example, for a booking platform:

> Hosts with more than one property can now see every check-in for the week on one
> screen. Until today they opened each property in turn and copied the dates into a
> notebook. From Monday the week view is the first thing they see after logging in, and
> the notebook can stay closed.

Write it, read it aloud, then build the smallest thing that makes it true. If the finished
work does not match the paragraph, change the paragraph and say so in the pull request;
do not quietly ship something the announcement does not describe.

Where this comes from: the working-backwards practice described in Working Backwards by
Colin Bryar and Bill Carr, https://www.workingbackwards.com.
