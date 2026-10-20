# Check reference

Details of `product-engineer check` that the README links to. The README keeps the short version.

## Cited paths

A message that says the fix is
in `src/gate.ts:120` is claiming something a reader will act on, and the line number is the part that
rots while the sentence stays still. Every `path/to/file.ext` and every GitHub Actions run URL in the
message is resolved: a missing file, a directory, or a line past the end of a real file is a warning,
`--references error` makes it an error and `--references off` turns it off. A message that cites
nothing is reported as citing nothing, at info level, and passes in every mode. That is deliberate:
a check that demanded a link would be satisfied by a link typed from memory, and the first person to
learn it was wrong would be the reader who followed it. Suggested by
[@raju_dandigam](https://dev.to/raju_dandigam), who asked for machine-checkable evidence without the
block turning into boilerplate. Nothing here makes a network request, so a run URL is checked for
shape only and says so.

## Readability

The block also gets a readability line, Flesch (1948) for English or Ateşman (1997) with
`--lang tr`, plus LIX (Björnsson, 1968), as information only. All three count syllables or
word lengths in the Latin alphabet, so for a block written in any other script the tool names
the script, says it is not scoring and why, and prints no number. Japanese, Chinese, Korean,
Arabic, Hebrew and Thai each get their own reason; Cyrillic, Greek and Devanagari are refused
because no calibration for them is implemented here, not because the language resists one; and
a script the tool cannot name is still refused. Before that, a block in Hindi, Tamil, Greek or
Amharic came back Flesch 0, graded hard, which is a number nobody counted.
