#!/usr/bin/env node
// Writes the seven rules from skills/product-engineer/SKILL.md into every instruction
// file the surveyed agents read, so an agent that never loads SKILL.md still gets them,
// and into examples/cursor/, a copy people drop into their own project.
//   node scripts/generate-adapters.mjs            # write the files
//   node scripts/generate-adapters.mjs --check    # exit 1 when any file is out of date
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shippedHeadings } from "../bin/headings.mjs";

const SOURCE = "skills/product-engineer/SKILL.md";
const HEADINGS = "skills/product-engineer/references/headings.md";
const NOTE = `Generated from ${SOURCE} by scripts/generate-adapters.mjs. Edit the skill, then run: node scripts/generate-adapters.mjs`;

/** The rules: the skill body without frontmatter and without the title line. */
export function rulesFrom(skillText) {
  const parts = skillText.split(/^---\s*$/m);
  const body = parts.length >= 3 ? parts.slice(2).join("---") : skillText;
  return body.trim().replace(/^# product-engineer\s*\n/, "").trim();
}

export function descriptionFrom(skillText) {
  const m = skillText.match(/^description:\s*(.+)$/m);
  return m ? m[1].trim() : "";
}

/**
 * The commit-msg hook, written from the headings table so the hook and the check cannot
 * disagree about which headings exist. A basic regular expression, so it runs under any
 * POSIX sh; the anchored alternation covers the shipped rows and `grep -F` covers a
 * heading configured in .product-engineer.json, whose text may contain anything.
 * The colon is an alternation, not a bracket expression: without a UTF-8 locale grep reads
 * a fullwidth colon as three bytes, and a bracket would match only one of them.
 */
export function hookFrom(rows) {
  const alt = (key) => rows.map((r) => r[key].replace(/[.[\]\\*^$]/g, "\\$&").replace(/:$/, "(:|：)")).join("|");
  return `#!/bin/sh
# Generated from ${HEADINGS} by scripts/generate-adapters.mjs.
# Edit the table, then run: node scripts/generate-adapters.mjs
# product-engineer commit-msg hook: every commit explains itself to the customer.
# Install: sh scripts/install-hook.sh   (copies this file to .git/hooks/commit-msg)
# Opt out for one commit: put [no-customer] anywhere in the message.
file="$1"
first=$(sed -n '1p' "$file")
case "$first" in
  Merge*|fixup!*|squash!*|Revert*) exit 0 ;;
esac
if grep -q '\\[no-customer\\]' "$file"; then exit 0; fi

# The shipped languages: ${rows.map((r) => r.language).join(", ")}.
if grep -qE '^(${alt("block")})[[:space:]]*$' "$file" && grep -qE '^(${alt("what")})' "$file"; then exit 0; fi

# A heading this repository configured for a language the table does not ship.
cfg=".product-engineer.json"
if [ -f "$cfg" ]; then
  b=$(sed -n 's/.*"block"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/p' "$cfg" | head -1)
  w=$(sed -n 's/.*"what"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/p' "$cfg" | head -1)
  if [ -n "$b" ] && [ -n "$w" ] && grep -qF "$b" "$file" && grep -qF "$w" "$file"; then exit 0; fi
fi

cat >&2 <<MSG
product-engineer: the commit message has no "${rows[0].block}" block.
Add:  ${rows[0].block}  /  ${rows[0].what} ...  /  ${rows[0].why} ...   (or put [no-customer] in the message)
Another language: see ${HEADINGS}
MSG
exit 1
`;
}

export function adapters(skillText, version, rows = shippedHeadings()) {
  const rules = rulesFrom(skillText);
  const description = descriptionFrom(skillText);
  const body = `# product-engineer\n\n${rules}\n`;
  const marked = `<!-- ${NOTE} -->\n\n${body}`;
  const copied = `<!-- Copied from Bubblegunn/product-engineer ${version}, source ${SOURCE}. Newer rules: copy the file again from a newer release. -->\n\n${body}`;
  const preface = [
    "# For agents working in this repository, and for agents that installed it",
    "",
    `The skill lives in \`${SOURCE}\`; the rules below are copied from it. Every commit in`,
    'this repository carries the "For the customer" block; `scripts/commit-msg` enforces it.',
    "Other agents: `npx skills add Bubblegunn/product-engineer` places the skill for you.",
    "",
  ].join("\n");
  return {
    ".cursor/rules/product-engineer.mdc": `---\ndescription: ${JSON.stringify(description)}\nalwaysApply: true\n---\n${marked}`,
    "examples/cursor/.cursor/rules/product-engineer.mdc": `---\ndescription: ${JSON.stringify(description)}\nalwaysApply: true\n---\n${copied}`,
    ".github/copilot-instructions.md": marked,
    "GEMINI.md": marked,
    "gemini-extension.json": `${JSON.stringify({ name: "product-engineer", version, description, contextFileName: "GEMINI.md" }, null, 2)}\n`,
    ".clinerules/product-engineer.md": marked,
    ".kiro/steering/product-engineer.md": `---\ninclusion: always\n---\n${marked}`,
    ".windsurf/rules/product-engineer.md": `---\ntrigger: always_on\n---\n${marked}`,
    "AGENTS.md": `<!-- ${NOTE} -->\n\n${preface}\n${body}`,
    "scripts/commit-msg": hookFrom(rows),
  };
}

function main(argv) {
  const rootIndex = argv.indexOf("--root");
  const root = resolve(rootIndex >= 0 ? argv[rootIndex + 1] : join(dirname(fileURLToPath(import.meta.url)), ".."));
  const check = argv.includes("--check");
  const skill = readFileSync(join(root, SOURCE), "utf8");
  const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const files = adapters(skill, version);
  const stale = [];
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    if (check) {
      if (!existsSync(path) || readFileSync(path, "utf8") !== content) stale.push(rel);
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    console.log(`wrote ${rel}`);
  }
  if (check && stale.length) {
    console.error(`out of date: ${stale.join(", ")}\nrun: node scripts/generate-adapters.mjs`);
    return 1;
  }
  if (check) console.log(`adapters up to date (${Object.keys(files).length} files)`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
