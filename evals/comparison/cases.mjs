// The messages both checkers are run on (docs/COMPARISON.md). Each case belongs to an `area`, the
// job one of the tools says it does. `defect` is the truth label for that area: true means a tool
// that does the area's job should flag the message. `change`, when present, is a change staged in a
// throwaway repository, for the tools that can read the change as well as the message.
const BLOCK =
  "For the customer:\n" +
  "What changed: Accountants can download a month of bookings as a spreadsheet.\n" +
  "Why it matters: They asked for this every month and typed it by hand.\n";

export const AREAS = {
  "customer-block": "The message carries a plain-language customer section",
  "block-quality": "The customer section reads as asked: jargon explained, evidence observed, numbers counted",
  "message-vs-change": "The message agrees with the change it describes",
  "conventional-format": "The message follows the Conventional Commits shape",
  skips: "Merge commits are left alone",
};

export const CASES = [
  { id: "block-present", area: "customer-block", defect: false, title: "A full customer block", message: `feat(export): monthly bookings as CSV\n\n${BLOCK}` },
  { id: "block-missing", area: "customer-block", defect: true, title: "No customer block", message: "feat(export): monthly bookings as CSV\n\nAdds a CSV export endpoint.\n" },
  { id: "block-empty", area: "customer-block", defect: true, title: "A heading with nothing under it", message: "feat(export): monthly bookings as CSV\n\nFor the customer:\nWhat changed:\n" },
  {
    id: "block-turkish",
    area: "customer-block",
    defect: false,
    title: "A full block written in Turkish",
    message: "feat(export): aylık rezervasyonlar CSV olarak\n\nMüşteri için:\nNe değişti: Muhasebeciler bir ayın rezervasyonlarını tablo olarak indirebilir.\nNeden önemli: Her ay elle yazıyorlardı.\n",
  },
  {
    id: "jargon-unexplained",
    area: "block-quality",
    defect: true,
    title: "Jargon in the block with no explanation",
    message: "feat(hooks): retries\n\nFor the customer:\nWhat changed: The webhook is now idempotent.\nWhy it matters: Fewer duplicates.\n",
  },
  {
    id: "tests-as-evidence",
    area: "block-quality",
    defect: true,
    title: "Passing tests offered as the evidence",
    message: "fix(badge): count\n\nFor the customer:\nWhat changed: The bell no longer counts things the system handled by itself.\nWhy it matters: All 42 tests pass, so the count is right now.\n",
  },
  { id: "bare-number", area: "block-quality", defect: true, title: "A number with no method or scope", message: `feat(report): faster\n\nThe report is 40 percent faster.\n\n${BLOCK}` },
  {
    id: "diff-tests-claim",
    area: "message-vs-change",
    defect: true,
    title: "Says tests were added; the change has none",
    message: `feat(export): monthly CSV\n\nI added tests for the export.\n\n${BLOCK}`,
    change: { "src/export.js": "export const a = 1;\n" },
  },
  { id: "subject-not-conventional", area: "conventional-format", defect: true, title: "A subject with no type", message: `Added the export button\n\n${BLOCK}` },
  { id: "subject-too-long", area: "conventional-format", defect: true, title: "A subject over 100 characters", message: `feat(export): ${"a".repeat(100)}\n\n${BLOCK}` },
  {
    id: "body-line-too-long",
    area: "conventional-format",
    defect: true,
    title: "A body line over 100 characters",
    message: `feat(export): monthly bookings as CSV\n\n${"x".repeat(60)} ${"y".repeat(60)} ${"x".repeat(60)} ${"y".repeat(60)}\n\n${BLOCK}`,
  },
  { id: "merge-commit", area: "skips", defect: false, title: "A merge commit", message: "Merge branch 'x' into main\n" },
];
