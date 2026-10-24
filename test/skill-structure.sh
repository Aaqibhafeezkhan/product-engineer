#!/bin/sh
# test/skill-structure.sh: every skill has spec-complete frontmatter; the core skill has the seven rules.
set -eu
fail() { echo "FAIL: $1"; exit 1; }
for dir in product-engineer customer-block done-means-observed release-notes; do
  f="skills/$dir/SKILL.md"
  [ -f "$f" ] || fail "$f missing"
  head -1 "$f" | grep -q '^---$' || fail "$f: frontmatter must open with ---"
  grep -q "^name: $dir$" "$f" || fail "$f: name must equal the directory"
  grep -q '^description: Use when' "$f" || fail "$f: description must start with 'Use when'"
  grep -q '^license: MIT$' "$f" || fail "$f: license: MIT"
  grep -q '^metadata:$' "$f" || fail "$f: metadata block"
  grep -q '^  author: ' "$f" || fail "$f: metadata.author"
  grep -q '^  version: ' "$f" || fail "$f: metadata.version"
  grep -q '^  source: https://github.com/Bubblegunn/product-engineer' "$f" || fail "$f: metadata.source"
  [ "$(wc -l < "$f")" -le 120 ] || fail "$f: over 120 lines"
  grep -c '—' "$f" | grep -q '^0$' || fail "em dash in $f"
done
f="skills/product-engineer/SKILL.md"
for n in 1 2 3 4 5 6 7; do
  grep -q "^## $n\. " "$f" || fail "rule $n heading missing"
done
grep -q 'For the customer:' "$f" || fail "block heading missing"
for r in commit-template five-questions definition-of-done plain-language not-shipped press-release ship-show-ask appetite headings; do
  p="skills/product-engineer/references/$r.md"
  [ -f "$p" ] || fail "$p missing"
done
for p in skills/product-engineer/references/*.md; do
  grep -c '—' "$p" | grep -q '^0$' || fail "em dash in $p"
done
for t in plain-language plain-language.tr plain-language.ja plain-language.zh; do
  p="skills/product-engineer/references/$t.md"
  [ -f "$p" ] || fail "$p missing"
  grep -q '^| idempotent' "$p" || fail "$p missing idempotent row"
  [ "$(grep '^| ' "$p" | grep -vc '^| term')" -eq 15 ] || fail "$p must have 15 rows"
done
# The pack gate: a skill in skills/ must name metrics that evals/score.mjs actually scores,
# and a skill in skills/.experimental/ must name none and say so in its own description. Without
# this a contributed skill joins the pack by being copied into the directory.
metrics=$(node -e "import('./evals/score.mjs').then(m => console.log(Object.keys(m.metrics).join(' ')))")
for f in skills/*/SKILL.md; do
  dir=$(basename "$(dirname "$f")")
  line=$(grep '^  measuredBy: \[' "$f" || true)
  [ -n "$line" ] || fail "$f: a skill in the pack must declare metadata.measuredBy naming metrics from evals/score.mjs, or live in skills/.experimental/"
  names=$(printf '%s' "$line" | sed 's/^  measuredBy: \[//; s/\]$//; s/,/ /g')
  [ -n "$names" ] || fail "$f: measuredBy is empty; move the skill to skills/.experimental/"
  for m in $names; do
    case " $metrics " in *" $m "*) ;; *) fail "$f: measuredBy names $m, which evals/score.mjs does not score" ;; esac
  done
done
for f in skills/.experimental/*/SKILL.md; do
  [ -e "$f" ] || continue
  grep -q '^  measuredBy:' "$f" && fail "$f: an experimental skill is not measured; drop measuredBy or move it into the pack"
  grep -q '^description: Experimental:' "$f" || fail "$f: description must open with 'Experimental:', because that marker is what travels with the file once installed"
done

for j in .claude-plugin/marketplace.json plugin/.claude-plugin/plugin.json; do
  [ -f "$j" ] || fail "$j missing"
  node -e "JSON.parse(require('fs').readFileSync('$j','utf8'))" || fail "$j is not valid JSON"
done
grep -q '"name": "product-engineer"' plugin/.claude-plugin/plugin.json || fail "plugin name"
v=$(node -p "require('./package.json').version")
grep -q "\"version\": \"$v\"" plugin/.claude-plugin/plugin.json || fail "plugin version must equal package.json ($v)"
[ -f AGENTS.md ] || fail "AGENTS.md missing"
grep -q '"source": "./plugin"' .claude-plugin/marketplace.json || fail "marketplace.json must point at ./plugin"
[ -f plugin/README.md ] && [ -f plugin/LICENSE ] || fail "plugin/ needs README.md and LICENSE"
# The hook is generated from the headings table; every shipped block heading must be in it.
sed -n 's/^| \([a-z][a-z]\) | \([^|]*\) |.*/\2/p' skills/product-engineer/references/headings.md | while read -r h; do
  h=$(printf '%s' "$h" | sed 's/[[:space:]]*$//; s/:$//')
  grep -qF "$h" scripts/commit-msg || fail "commit-msg hook does not carry the heading: $h"
done
echo "ok: skill structure (4 skills)"
