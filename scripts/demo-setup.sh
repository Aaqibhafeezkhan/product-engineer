#!/bin/sh
# Builds a throwaway repository for docs/demo-diff.tape and prints its path.
# The message in msg.txt claims tests; the staged change has none. test/total.test.js is
# present but not staged, so the tape can stage it and run the check again.
set -eu
dir=$(mktemp -d "${TMPDIR:-/tmp}/pe-demo.XXXXXX")
cd "$dir"
git init -q
git config user.email demo@example.com
git config user.name demo
mkdir src test
printf 'export const total = (lines) => lines.reduce((sum, n) => sum + n, 0);\n' > src/total.js
git add src/total.js
git commit -q -m "chore: start"
printf 'export const total = (lines) => lines.filter(Boolean).reduce((sum, n) => sum + n, 0);\n' > src/total.js
git add src/total.js
printf 'import test from "node:test";\nimport assert from "node:assert/strict";\nimport { total } from "../src/total.js";\n\ntest("zero lines are ignored", () => assert.equal(total([0, 5]), 5));\n' > test/total.test.js
cat > msg.txt <<'MSG'
fix(total): ignore zero lines

For the customer:
What changed: Invoice totals now skip lines that are zero, and I added tests for it.
Why it matters: Invoices no longer show a wrong sum.
MSG
printf '%s\n' "$dir"
