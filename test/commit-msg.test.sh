#!/bin/sh
# test/commit-msg.test.sh
set -eu
hook="scripts/commit-msg"
tmp=$(mktemp -d)
pass=0; fail=0
check() { # $1 expected exit, $2 name, $3 message
  printf '%s\n' "$3" > "$tmp/msg"
  if sh "$hook" "$tmp/msg" >/dev/null 2>&1; then got=0; else got=1; fi
  if [ "$got" = "$1" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $2 (expected exit $1, got $got)"; fi
  # Again with no UTF-8 locale (LC_ALL=C, and Git Bash on Windows when LANG is unset), where grep
  # reads the message byte by byte. A fullwidth colon in a bracket expression is then three bytes.
  if LC_ALL=C sh "$hook" "$tmp/msg" >/dev/null 2>&1; then got=0; else got=1; fi
  if [ "$got" = "$1" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $2 under LC_ALL=C (expected exit $1, got $got)"; fi
}
check 0 "full block" "feat: thing

For the customer:
What changed: People can export their bookings.
Why it matters: Accountants asked for it every month."
check 1 "missing block" "feat: thing without the block"
check 1 "heading without what-changed" "feat: thing

For the customer:
Why it matters: nothing"
check 0 "merge commit" "Merge branch 'main' into feature"
check 0 "fixup" "fixup! feat: thing"
check 0 "revert" "Revert \"feat: thing\""
check 0 "opt out" "chore: bump deps [no-customer]"
check 0 "Turkish block" "feat: thing

Müşteri için:
Ne değişti: Muhasebeciler tabloyu indirebiliyor."
check 0 "Japanese block" "feat: thing

お客さまへ:
変わったこと: 取得できます。"
check 0 "Chinese block, fullwidth colon" "feat: thing

给客户：
改动内容： 会计可以下载记录。"

# A heading this repository does not ship, named in .product-engineer.json.
cd "$tmp"
printf '%s\n' '{ "headings": { "block": "Für den Kunden:", "what": "Was sich geändert hat:" } }' > .product-engineer.json
printf '%s\n' "feat: thing" "" "Für den Kunden:" "Was sich geändert hat: Buchungen laden." > msg2
if sh "$OLDPWD/$hook" msg2 >/dev/null 2>&1; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: configured heading (expected exit 0)"; fi
printf '%s\n' "feat: thing without any block" > msg3
if sh "$OLDPWD/$hook" msg3 >/dev/null 2>&1; then fail=$((fail+1)); echo "FAIL: configured heading still requires a block"; else pass=$((pass+1)); fi
cd "$OLDPWD"
rm -rf "$tmp"
echo "commit-msg: $pass passed, $fail failed"
[ "$fail" = 0 ]
