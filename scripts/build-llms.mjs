// Generates site/llms.txt and site/llms-full.txt from llms.txt (hand-written) and the docs.
//   node scripts/build-llms.mjs          write both files
//   node scripts/build-llms.mjs --check  exit 1 if either file differs from what would be written
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/Bubblegunn/product-engineer";
const read = (p) => readFileSync(join(root, p), "utf8");

function absolute(text) {
  return text.replace(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g, (_, p) => {
    const kind = /\.[a-z0-9]+(#.*)?$/i.test(p) ? "blob" : "tree";
    return `](${REPO}/${kind}/main/${p})`;
  });
}

export function build() {
  const llms = absolute(read("llms.txt"));
  const docs = ["README.md"];
  const dir = join(root, "docs");
  for (const f of readdirSync(dir).sort()) {
    if (/^(FAQ|vs-.*|COMPARISON|check-reference)\.md$/.test(f)) docs.push(`docs/${f}`);
  }
  const full = [llms.trimEnd()]
    .concat(docs.filter((p) => existsSync(join(root, p))).map((p) => `# FILE: ${p}\n\n${read(p).trimEnd()}`))
    .join("\n\n---\n\n")
    .concat("\n");
  return { "site/llms.txt": llms, "site/llms-full.txt": full };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = build();
  const check = process.argv.includes("--check");
  let drift = false;
  for (const [path, text] of Object.entries(out)) {
    const have = existsSync(join(root, path)) ? read(path) : null;
    if (check) {
      if (have !== text) {
        console.error(`${path} is out of date; run: node scripts/build-llms.mjs`);
        drift = true;
      }
    } else {
      writeFileSync(join(root, path), text);
      console.log(`wrote ${path}`);
    }
  }
  if (drift) process.exit(1);
}
