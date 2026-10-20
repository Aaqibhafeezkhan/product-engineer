// Read a change from git and cross-check what the message claims against what the diff shows.
//
// The rest of this tool reads the message alone, so it can tell whether the author said the
// right shapes. It cannot tell whether what they said is true. That gap is where the 2026
// complaint about agent-written pull requests lives: the description reads clean, the diff is
// large, and the reviewer has no way to tell which sentences were checked.
//
// Every check here is mechanical and reports at warning level only, so no existing run turns
// red on an upgrade. Each finding names what was counted, because rule five applies to this
// tool as much as to the messages it reads.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const git = (args, cwd) =>
  execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

/** A path that holds tests, by the conventions the common runners use. */
export const isTestPath = (p) => /(^|\/)(tests?|spec|__tests__)\//i.test(p) || /(^|\/)[^/]+[._-](test|spec)\.[a-z0-9]+$/i.test(p) || /(^|\/)test_[^/]+\.py$/i.test(p);

/** A path a reader would call documentation rather than code. */
export const isDocPath = (p) => /\.(md|mdx|markdown|rst|txt|adoc)$/i.test(p) || /(^|\/)docs?\//i.test(p) || /(^|\/)(LICENSE|NOTICE|AUTHORS)$/i.test(p);

/**
 * Read a change as a list of files with line counts.
 * range: a git range such as "main...HEAD"; omit for the staged change, which is what the
 * commit-msg hook is about to record.
 */
export function readDiff({ range, cwd = process.cwd() } = {}) {
  const args = ["diff", "--numstat", "-z", ...(range ? [range] : ["--cached"])];
  const raw = git(args, cwd);
  const fields = raw.split("\0").filter((f) => f !== "");
  const files = [];
  for (let i = 0; i < fields.length; i++) {
    const m = /^(\d+|-)\t(\d+|-)\t(.*)$/.exec(fields[i]);
    if (!m) continue;
    const [, add, del, name] = m;
    // A rename writes an empty name, then the old and new paths as two more fields.
    let path = name;
    if (name === "") {
      path = fields[i + 2] ?? "";
      i += 2;
    }
    if (!path) continue;
    files.push({ path, added: add === "-" ? 0 : Number(add), removed: del === "-" ? 0 : Number(del), binary: add === "-" });
  }
  return { files, range: range ?? "--cached" };
}

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

// A claim that tests were written, rather than that tests were run. "tests pass" is rule 3's
// business and is checked elsewhere; this is about a file that should exist in the diff.
const TEST_CLAIM = /\b(add(ed|s|ing)?|wrote|writes?|writing|introduc(e|ed|es)|includ(e|ed|es)|new|cover(ed|s)? (it|this|that) with)\b[^.\n]{0,40}\b(regression |unit |integration |failing )?tests?\b|\btests?\b[^.\n]{0,20}\b(added|written|cover this)\b/i;

// Only the "only" family: a refactor may legitimately touch source while claiming no
// behaviour change, so that phrasing is deliberately not checked.
// The lookbehind keeps a hyphenated identifier from reading as a claim: the corpus type
// name `extra-docs-only` contains "docs-only" and named it in a commit message here, which
// the baseline caught as a false alarm. A token inside a longer compound is a name.
const DOCS_ONLY_CLAIM = /(?<![-\w])(documentation|docs?|readme|comment)[- ]only\b|\bonly (the )?(documentation|docs?|readme|comments?)\b|\bno (code|source) changes?\b/i;

const CHANGE_VERB = /\b(chang(e|ed|es)|touch(ed|es)?|modif(y|ied|ies)|updat(e|ed|es)|edit(ed|s)?|add(ed|s)?|remov(e|ed|es)|delet(e|ed|es)|rewrit(e|ten|es))\b/i;

const COUNT_RE = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+files?\b/i;

// A planning artefact contains a description of tests; it does not add them. "The design now
// has a plan with the tests written out" is about a document, and reading it as a claim that
// this change adds tests was a false alarm on a real commit.
const DESCRIBED_NOT_ADDED = /\b(plan|design|spec|specification|roadmap|checklist|proposal)\b/i;

/** Paths named in the text: backticked, or bare with a directory separator and an extension. */
export function namedPaths(text) {
  const found = new Set();
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim();
    if (/^[\w.@-]+(\/[\w.@ -]+)+\.[a-z0-9]+$/i.test(t)) found.add(t);
  }
  for (const m of text.matchAll(/(?<![`\w/.])((?:[\w.@-]+\/)+[\w.@-]+\.[a-z0-9]+)(?![\w`])/gi)) found.add(m[1]);
  return [...found];
}

const sentencesWith = (text, re) =>
  text
    .split(/(?<=[.!?])\s+|(?<=[。！？।])\s*|\n+/)
    .filter((s) => re.test(s) && !/^\s*(Co-Authored-By|Claude-Session|Signed-off-by)/.test(s));

/**
 * Cross-check a message against a diff. Returns findings in the shape analyse() uses.
 * Nothing here reports an error: a new check must not turn an existing run red.
 */
export function crossCheck(text, diff, { cwd = process.cwd() } = {}) {
  const findings = [];
  const add = (level, message, code) => findings.push({ level, message, code });
  const files = diff.files;
  // A phrase inside backticks or quotation marks is being named, not asserted. Without this,
  // a message describing the checks ("reports \"documentation only\" over a source change")
  // is read as making the claim it describes. Found by running this on its own commit.
  const body = text.replace(/^\s*(Co-Authored-By|Claude-Session|Signed-off-by):.*$/gim, "");
  // Claims are read from a masked copy; paths are read from the body, because a path is
  // normally written in backticks and naming one is not the same as quoting a phrase.
  const claims = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/"[^"\n]{0,120}"|\u201c[^\u201d\n]{0,120}\u201d/g, " ");

  if (!files.length) {
    add("info", `the change at ${diff.range} touches no files, so nothing was cross-checked`, "diff-empty");
    return findings;
  }

  const tests = files.filter((f) => isTestPath(f.path));
  const docs = files.filter((f) => isDocPath(f.path));
  const source = files.filter((f) => !isTestPath(f.path) && !isDocPath(f.path));
  add("info", `cross-checked against ${files.length} file${files.length === 1 ? "" : "s"} at ${diff.range}: ${source.length} source, ${tests.length} test, ${docs.length} documentation`, "diff-checked");

  // 1. A claim that tests were written, with no test file gaining a line.
  const testClaims = sentencesWith(claims, TEST_CLAIM).filter((s) => !DESCRIBED_NOT_ADDED.test(s));
  if (testClaims.length) {
    const written = tests.filter((f) => f.added > 0);
    if (!written.length) {
      add("warn", `the message says tests were added; no test file gains a line in this change (${files.length} file${files.length === 1 ? "" : "s"} counted, ${tests.length} of them under a test path)`, "diff-tests-missing");
    } else {
      add("ok", `tests claimed and ${written.length} test ${written.length === 1 ? "file gains" : "files gain"} lines`, "diff-tests-found");
    }
  }

  // 2. A claim that only documentation changed, with source or tests in the diff.
  if (DOCS_ONLY_CLAIM.test(claims)) {
    const other = [...source, ...tests];
    if (other.length) {
      const named = other.slice(0, 3).map((f) => f.path).join(", ");
      add("warn", `the message says the change is documentation only; ${other.length} file${other.length === 1 ? " is" : "s are"} not documentation: ${named}${other.length > 3 ? ", and more" : ""}`, "diff-docs-only-mismatch");
    } else {
      add("ok", "documentation only, and the change touches documentation only", "diff-docs-only-ok");
    }
  }

  // 3. A stated file count that the diff contradicts.
  //
  // The count has to be the object of the change verb, not merely in the same sentence as
  // one. Measured against 56 real commits, the looser reading produced three false alarms
  // out of four: "run left five files modified" describes what a previous run left behind,
  // and "Cursor users can drop one file into their project" borrowed its verb from the
  // "What changed:" heading while counting something a reader might do. Requiring the verb
  // in the short window before the count reads all three as what they are. The cost is that
  // the passive "five files were changed" is no longer checked, which is a miss rather than
  // a false alarm, and that is the direction this tool errs in.
  for (const s of sentencesWith(claims, COUNT_RE)) {
    const m = COUNT_RE.exec(s);
    const claimed = /^\d+$/.test(m[1]) ? Number(m[1]) : WORDS[m[1].toLowerCase()];
    if (claimed === undefined) continue;
    if (!CHANGE_VERB.test(s.slice(Math.max(0, m.index - 28), m.index))) continue;
    if (claimed !== files.length) add("warn", `the message says ${m[1]} file${claimed === 1 ? "" : "s"}; the change has ${files.length}: "${s.trim().slice(0, 70)}"`, "diff-file-count-mismatch");
    else add("ok", `the stated file count matches the change: ${files.length}`, "diff-file-count-ok");
  }

  // 4. A path named in the message that is neither in the change nor in the repository.
  // A path that exists but is untouched is ordinary context, so only a broken reference is
  // reported: that is the shape a renamed or invented file leaves behind.
  const inDiff = new Set(files.map((f) => f.path));
  const broken = namedPaths(body).filter((p) => !inDiff.has(p) && !existsSync(join(cwd, p)));
  if (broken.length) {
    add("warn", `the message names ${broken.length === 1 ? "a path" : "paths"} that ${broken.length === 1 ? "is" : "are"} not in this change and not in the repository: ${broken.slice(0, 3).join(", ")}`, "diff-path-missing");
  }

  return findings;
}
