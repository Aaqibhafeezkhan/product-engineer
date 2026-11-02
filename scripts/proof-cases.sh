#!/bin/sh
# Builds a throwaway repository per case and runs the real checker on it, printing the commands and the
# real output. docs/proof.md is this script's output, and test/proof.test.mjs fails when they differ.
#   sh scripts/proof-cases.sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
pe="node $here/bin/check.mjs"
work=$(mktemp -d "${TMPDIR:-/tmp}/pe-proof.XXXXXX")
trap 'rm -rf "$work"' EXIT

BLOCK='

For the customer:
What changed: Guests see the right total.
Why it matters: Invoices stop showing a wrong sum.'

new_repo() {
  dir="$work/$1"
  mkdir -p "$dir/src" "$dir/test"
  cd "$dir"
  git init -q -b main
  git config user.email proof@example.com
  git config user.name proof
  printf 'export function login(req) {\n  requireAuth(req);\n  return true;\n}\nexport function helper() {\n  return 1;\n}\n' > src/api.js
  printf 'old\n' > src/old.js
  printf '# project\n' > README.md
  git add -A
  git commit -q -m "chore: start"
}

show() { # title, message, then the staged change is already in place
  printf '### %s\n\n' "$1"
  printf '```\n$ cat msg.txt\n%s\n' "$2"
  printf '%s\n' "$2" > msg.txt
  printf '\n$ product-engineer check msg.txt --diff\n'
  $pe check msg.txt --diff | grep -v '^info  readability' | grep -v '^info  no file or run reference' || true
  printf '```\n\n'
}

new_repo a; printf 'export const total = (a) => a.filter(Boolean).reduce((s, n) => s + n, 0);\n' > src/total.js; git add -A
show "A false claim: tests added, none in the change" "fix(total): ignore zero lines

I added tests for it.$BLOCK"

new_repo b; git rm -q src/old.js
show "A file said to be added is deleted" "feat: added \`src/old.js\` for legacy lookups$BLOCK"

new_repo c; printf 'export function login(req) {\n  requireAuth(req);\n  audit(req);\n  return true;\n}\nexport function helper() {\n  return 1;\n}\n' > src/api.js; git add -A
show "A name said to be removed is added" "fix: removed the \`audit\` call from login$BLOCK"

new_repo d; printf '# project\n\nmore\n' > README.md; git add -A
show "A bug fix that changed only documentation" "fix: fixed the crash when a booking is empty$BLOCK"

new_repo e; printf 'export function login(req) {\n  requireAuth(req);\n  return true;\n}\n' > src/api.js; git add -A
show "No breaking changes, and an export is gone" "refactor: tidy the api. No breaking changes.$BLOCK"

new_repo f; printf 'more\n' >> src/old.js; git add -A
show "What a diff cannot show: the tests ran" "fix: tweak old. I ran the tests and they all pass.$BLOCK"

printf '## Where it passes and is wrong or blind\n\n'

new_repo g; printf 'import test from "node:test";\n' > test/empty.test.js; printf 'x\n' >> src/old.js; git add -A
show "Failure: a test file with no test in it counts as tests added" "fix: tweak old. Added tests.$BLOCK"

new_repo h; git rm -q src/old.js
show "Failure: a Turkish message is not read for claims" "feat: \`src/old.js\` eklendi, testler eklendi$BLOCK"
