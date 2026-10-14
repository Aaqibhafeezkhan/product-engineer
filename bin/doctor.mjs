#!/usr/bin/env node
// product-engineer doctor: which agents on this machine carry the skill, and are the
// copies current? Zero dependencies. A copy is current when its rules text matches the
// packaged SKILL.md; agents keep their own copies, so they drift silently.
import { readFileSync, existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const PACKAGED = join(here, "..", "skills", "product-engineer", "SKILL.md");
// The version reported is the installed package's. The SKILL.md metadata.version once drifted to
// 0.3.2 under a 0.4.0 package, and doctor printed the drifted one.
const packageVersion = () => JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")).version;

/** The rules: the skill body without front matter and without the title line. */
export function rulesFrom(skillText) {
  const parts = skillText.split(/^---\s*$/m);
  const body = parts.length >= 3 ? parts.slice(2).join("---") : skillText;
  return body.trim().replace(/^# product-engineer\s*\n/, "").trim();
}

export function versionFrom(skillText) {
  const m = skillText.match(/^\s*version:\s*(\S+)\s*$/m);
  return m ? m[1] : null;
}

/** Normalised for comparison: an adapter wraps the same rules in its own front matter. */
const normalise = (s) => s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();

/**
 * Where the surveyed agents keep their copy. `skill` entries hold a whole SKILL.md;
 * `rules` entries embed the rules inside a file the agent reads on every request.
 */
export const LOCATIONS = [
  { agent: "Claude Code", path: ".claude/skills/product-engineer/SKILL.md", kind: "skill" },
  { agent: "shared (.agents)", path: ".agents/skills/product-engineer/SKILL.md", kind: "skill" },
  { agent: "Cursor", path: ".cursor/rules/product-engineer.mdc", kind: "rules" },
  { agent: "Copilot", path: ".github/copilot-instructions.md", kind: "rules" },
  { agent: "Gemini CLI", path: "GEMINI.md", kind: "rules" },
  { agent: "Codex and AGENTS.md readers", path: "AGENTS.md", kind: "rules" },
  { agent: "Cline", path: ".clinerules/product-engineer.md", kind: "rules" },
  { agent: "Kiro", path: ".kiro/steering/product-engineer.md", kind: "rules" },
  { agent: "Windsurf", path: ".windsurf/rules/product-engineer.md", kind: "rules" },
];

/**
 * @param {{ cwd?: string, home?: string, packagedPath?: string }} opts
 * @returns {{ version: string|null, scopes: {scope: string, root: string, rows: object[]}[], found: number, stale: number }}
 */
export function doctor(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const home = opts.home ?? homedir();
  const packaged = readFileSync(opts.packagedPath ?? PACKAGED, "utf8");
  const wantRules = normalise(rulesFrom(packaged));
  const wantVersion = packageVersion();

  const scopes = [];
  // Running in your home directory would otherwise count each copy twice. The key is the
  // real path: on macOS a temporary directory is reached through /var and /private/var alike.
  const seen = new Set();
  const key = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
  let found = 0;
  let stale = 0;
  for (const [scope, root] of [["project", cwd], ["user", home]]) {
    const rows = [];
    for (const loc of LOCATIONS) {
      const full = join(root, loc.path);
      if (!existsSync(full) || seen.has(key(full))) continue;
      seen.add(key(full));
      let text = "";
      try {
        text = readFileSync(full, "utf8");
      } catch {
        rows.push({ ...loc, full, state: "unreadable", version: null });
        continue;
      }
      const carriesRules = loc.kind === "skill" ? normalise(rulesFrom(text)) === wantRules : normalise(text).includes(wantRules);
      // A file that mentions the skill but not its rules is another project's file, not a copy.
      if (!carriesRules && !/product-engineer/i.test(text)) continue;
      found++;
      const version = versionFrom(text);
      const state = carriesRules ? "current" : "out of date";
      if (state === "out of date") stale++;
      rows.push({ ...loc, full, state, version });
    }
    if (rows.length) scopes.push({ scope, root, rows });
  }
  return { version: wantVersion, scopes, found, stale };
}

export function render(report) {
  const lines = [`product-engineer ${report.version ?? "unknown"}`];
  if (!report.scopes.length) {
    lines.push("");
    lines.push("No copy found in this project or in your home directory.");
    lines.push("Install:  npx skills add Bubblegunn/product-engineer");
    return lines.join("\n");
  }
  const width = Math.max(...report.scopes.flatMap((s) => s.rows.map((r) => r.path.length)));
  for (const s of report.scopes) {
    lines.push("");
    lines.push(`${s.scope}  ${s.root}`);
    for (const r of s.rows) {
      const version = r.version ? ` (${r.version})` : "";
      lines.push(`  ${r.path.padEnd(width)}  ${r.state}${version}  ${r.agent}`);
    }
  }
  lines.push("");
  lines.push(`${report.found} cop${report.found === 1 ? "y" : "ies"} found, ${report.stale} out of date.`);
  if (report.stale) lines.push("Update:  npx skills add Bubblegunn/product-engineer --all --copy");
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = doctor();
  console.log(render(report));
  process.exit(report.stale ? 1 : 0);
}
