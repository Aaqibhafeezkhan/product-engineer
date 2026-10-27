#!/bin/sh
# Appends one line per day to metrics.csv on the `metrics` branch:
# date,stars,forks,views_14d,unique_visitors_14d,clones_14d,unique_cloners_14d,npm_downloads_yesterday
# and rewrites badges/*.json there, shields.io endpoint files the README badges read, so the
# README shows current numbers without a commit to main.
#
# npm is asked for explicit dated ranges. Its last-day, last-week and last-month aliases were
# measured on 2026-10-27 returning a 2026-06-25..07-01 window for every package (react too), so
# a badge built on them said 0. A reply whose window is not the one asked for is not written:
# the badge keeps its last good value instead of turning into a false 0.
#
# Windows end two days back: at 03:17 UTC npm has not yet published yesterday and answers 0
# for it, so "yesterday" in the CSV column is the last complete day, the day before.
#
# METRICS_DRY_RUN=1 prints the line and the badge files and touches no branch.
set -eu
repo="${GITHUB_REPOSITORY:?}"
day=$(date -u +%F)
# Day offsets without GNU date: BSD (macOS) takes -v, GNU takes -d.
ago() { date -u -v-"$1"d +%F 2>/dev/null || date -u -d "$1 days ago" +%F; }
stars=$(gh api "repos/$repo" --jq '.stargazers_count')
forks=$(gh api "repos/$repo" --jq '.forks_count')
# Traffic needs push access; the job token cannot read it (403). Add a fine-grained
# METRICS_TOKEN secret (this repo, Administration: read) and the two columns fill in.
traffic() { gh api "repos/$repo/traffic/$1" --jq '"\(.count),\(.uniques)"' 2>/dev/null | grep -E '^[0-9]+,[0-9]+$' || echo ","; }
views=$(traffic views)
clones=$(traffic clones)

# npm downloads for start..end, or nothing when npm answers for any other window.
npm_range() {
  body=$(curl -fsS "https://api.npmjs.org/downloads/point/$1:$2/$NPM_PACKAGE" 2>/dev/null) || return 0
  case "$body" in *"\"start\":\"$1\""*"\"end\":\"$2\""*) ;; *) return 0 ;; esac
  printf '%s' "$body" | sed -n 's/.*"downloads":\([0-9]*\).*/\1/p'
}
# PyPI downloads over the last week and month (pypistats, without mirrors), or nothing.
pypi_recent() {
  curl -fsS "https://pypistats.org/api/packages/$PYPI_PACKAGE/recent" 2>/dev/null |
    sed -n "s/.*\"$1\": *\([0-9]*\).*/\1/p" || true
}
# 1234 -> 1.2k, the way shields prints counts.
short() { awk -v n="$1" 'BEGIN { if (n >= 1000000) printf "%.1fM", n/1e6; else if (n >= 1000) printf "%.1fk", n/1e3; else printf "%d", n }' | sed 's/\.0\([kM]\)$/\1/'; }
badge() { printf '{"schemaVersion":1,"label":"%s","message":"%s","color":"111111"}\n' "$1" "$2"; }

yesterday=$(ago 2)
downloads=""
npm_week=""
npm_month=""
if [ -n "${NPM_PACKAGE:-}" ]; then
  downloads=$(npm_range "$yesterday" "$yesterday")
  npm_week=$(npm_range "$(ago 8)" "$yesterday")
  npm_month=$(npm_range "$(ago 31)" "$yesterday")
fi
pypi_week=""
pypi_month=""
if [ -n "${PYPI_PACKAGE:-}" ]; then
  pypi_week=$(pypi_recent last_week)
  pypi_month=$(pypi_recent last_month)
  # pypistats has answered last_month 0 with last_week 7 for the same package; a month below
  # its own week is not a reading, so the month badge keeps its last value.
  if [ -n "$pypi_week" ] && [ -n "$pypi_month" ] && [ "$pypi_month" -lt "$pypi_week" ]; then pypi_month=""; fi
fi
line="$day,$stars,$forks,$views,$clones,$downloads"

# Writes badges/<name>.json only when the value was read; a missing value keeps the old file.
write_badges() {
  mkdir -p badges
  [ -n "$npm_week" ] && badge "npm downloads" "$(short "$npm_week")/week" > badges/npm-week.json
  [ -n "$npm_month" ] && badge "npm downloads" "$(short "$npm_month")/month" > badges/npm-month.json
  [ -n "$pypi_week" ] && badge "PyPI downloads" "$(short "$pypi_week")/week" > badges/pypi-week.json
  [ -n "$pypi_month" ] && badge "PyPI downloads" "$(short "$pypi_month")/month" > badges/pypi-month.json
  return 0
}

if [ "${METRICS_DRY_RUN:-}" = 1 ]; then
  echo "$line"
  dir=$(mktemp -d)
  (cd "$dir" && write_badges && for f in badges/*.json; do [ -e "$f" ] && echo "$f $(cat "$f")"; done; true)
  rm -rf "$dir"
  exit 0
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
if git fetch -q origin metrics 2>/dev/null; then
  git checkout -q metrics
else
  git checkout -q --orphan metrics
  git rm -rfq . >/dev/null 2>&1 || true
  printf 'date,stars,forks,views_14d,unique_visitors_14d,clones_14d,unique_cloners_14d,npm_downloads_yesterday\n' > metrics.csv
fi
write_badges
git add badges 2>/dev/null || true
if ! grep -q "^$day," metrics.csv 2>/dev/null; then
  echo "$line" >> metrics.csv
  git add metrics.csv
fi
if git diff --cached --quiet; then
  echo "nothing new for $day"; exit 0
fi
git commit -qm "metrics: $day"
git push -q origin metrics
echo "$line"
