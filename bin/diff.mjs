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
import { breakingClaim, claimedOnly, directionChecks, fixDocsOnly, isComment } from "./diff-claims.mjs";

// git's own first line of stderr is the useful part of a failure; "Command failed: git -c ..."
// is not. Outside a repository the line is followed by a hint, because that is the first thing
// a new user meets when they try the command in a scratch directory.
const git = (args, cwd, maxBuffer) => {
  try {
    return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...(maxBuffer ? { maxBuffer } : {}),
    });
  } catch (err) {
    const first = String(err.stderr ?? "").split("\n").find((l) => l.trim());
    if (!first) throw err;
    const text = first.replace(/^fatal: /, "");
    throw new Error(/not a git repository/i.test(text) ? `${text}; --diff reads the change from git, so run it inside the repository, or leave --diff off to check the message alone` : text);
  }
};

/** A path that holds tests, by the conventions the common runners use. */
export const isTestPath = (p) =>
  /(^|\/)(tests?|test-d|spec|__tests__)\//i.test(p) ||
  /(^|\/)[^/]+[._-](tests?|spec)(-d)?\.[a-z0-9]+$/i.test(p) ||
  /(^|\/)test_[^/]+\.py$/i.test(p) ||
  /(^|\/)[A-Z][A-Za-z0-9]*(Tests?|Spec|IT)\.(java|kt|cs|scala|swift|php|rb)$/.test(p);

/** A path a reader would call documentation rather than code. */
export const isDocPath = (p) => /\.(md|mdx|markdown|rst|txt|adoc)$/i.test(p) || /(^|\/)docs?\//i.test(p) || /(^|\/)(LICENSE|NOTICE|AUTHORS)$/i.test(p);

/**
 * Read a change as a list of files with line counts.
 * range: a git range such as "main...HEAD"; omit for the staged change, which is what the
 * commit-msg hook is about to record.
 */
export function readDiff({ range, cwd = process.cwd() } = {}) {
  const rangeArgs = range ? [range] : ["--cached"];
  // Outside a repository `git diff --cached` falls back to --no-index and fails with a usage
  // error that says nothing about the real problem, so ask first.
  git(["rev-parse", "--is-inside-work-tree"], cwd);
  const raw = git(["diff", "--numstat", "-z", ...rangeArgs], cwd);
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
  // The status of each file (added, deleted, modified, renamed), which numstat does not carry.
  const names = git(["diff", "--name-status", "-z", ...rangeArgs], cwd).split("\0").filter((f) => f !== "");
  const byPath = new Map(files.map((f) => [f.path, f]));
  for (let i = 0; i < names.length; i++) {
    const code = names[i][0];
    const two = code === "R" || code === "C";
    const path = two ? names[i + 2] : names[i + 1];
    const file = byPath.get(path);
    if (file) {
      file.status = code;
      if (two) file.oldPath = names[i + 1];
    }
    i += two ? 2 : 1;
  }
  // The changed lines, read only when a claim needs them, and at most once.
  let patch;
  const patchOnce = () => {
    if (patch === undefined) patch = readPatch(rangeArgs, cwd);
    return patch;
  };
  return { files, range: range ?? "--cached", patch: patchOnce };
}

/** The added and removed lines of every file: Map<path, { added, removed }>, or null if git cannot give them. */
function readPatch(rangeArgs, cwd) {
  let raw;
  try {
    raw = git(["diff", "-U0", "--no-color", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/", ...rangeArgs], cwd, 128 * 1024 * 1024);
  } catch {
    return null;
  }
  const byPath = new Map();
  let current = null;
  let from = null;
  let header = false;
  for (const line of raw.split("\n")) {
    if (line.startsWith("diff --git ")) {
      header = true;
      current = null;
      from = null;
    } else if (header && line.startsWith("--- ")) {
      from = line.slice(4).replace(/\t.*$/, "").replace(/^a\//, "");
    } else if (header && line.startsWith("+++ ")) {
      const to = line.slice(4).replace(/\t.*$/, "");
      const path = to === "/dev/null" ? from : to.replace(/^b\//, "");
      if (path && path !== "/dev/null") {
        current = byPath.get(path) ?? { added: [], removed: [] };
        byPath.set(path, current);
      }
    } else if (line.startsWith("@@")) {
      header = false;
    } else if (!header && current) {
      if (line.startsWith("+")) current.added.push(line.slice(1));
      else if (line.startsWith("-")) current.removed.push(line.slice(1));
    }
  }
  return byPath;
}

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

// A claim that tests were written, rather than that tests were run. "tests pass" is rule 3's
// business and is checked elsewhere; this is about a file that should exist in the diff.
// The gap between the verb and "tests" holds only the words a claim puts there (articles, numbers,
// kinds of test), so "add support to test release candidates", "includes running tests" and "add test
// pypi option" are not read as "tests were added". Singular "test" must end its phrase.
const TEST_KIND = "a|an|the|some|more|new|several|few|many|extra|additional|\\d+|two|three|four|five|six|regression|unit|integration|e2e|end-to-end|failing|missing|focused|small|basic|simple|typed|type|snapshot|property|coverage|edge[- ]case|test";
const TEST_CLAIM = new RegExp(`\\b(add(ed|s|ing)?|wrote|writes?|writing|introduc(e|ed|es)|includ(e|ed|es)|cover(ed|s)? (it|this|that) with)\\s+(?:(?:${TEST_KIND})\\s+){0,4}(?:tests\\b(?!-)|test(?=\\s*(?:[.,;:!)]|$|\\s(?:for|to|that|which|covering|in|on|of|case|cases|and|so|with|around)\\b)))|\\btests?\\s+(?:(?:were|are|was|is|have been|has been|got)\\s+)?(?:now\\s+)?(?:added|written)\\b|\\btests?\\s+(?:that\\s+|which\\s+)?cover\\s+this\\b`, "i");

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
// "Add tests and requirements.txt to sdist" ships tests in a package; it does not write them.
const DESCRIBED_NOT_ADDED = /\b(plan|design|spec|specification|roadmap|checklist|proposal|sdist|wheel|manifest|tarball)\b|\bto\s+(the\s+)?(package|bundle|archive|matrix|workflow|pipeline)\b/i;

// Shapes that look like a path and are not a file in this repository: a path relative to some other
// file ("./dist/index.cjs", "../helpers/x.js"), a package or module path that begins with a host
// ("gopkg.in/yaml.v3"), a version range ("v1.20.0/v1.21.0", "release/7.x"). Found on real commits.
const isRepositoryPath = (p) => {
  const parts = p.split("/");
  if (parts[0] === "." || parts[0] === "..") return false;
  if (/\.(com|org|net|io|in|dev|sh|co|app|ai|cloud|so)$/i.test(parts[0])) return false;
  if (parts.some((x) => /^v?\d+(\.(\d+|x))+$/.test(x))) return false;
  return true;
};

/** Paths named in the text: backticked, or bare with a directory separator and an extension. */
export function namedPaths(raw) {
  // A path inside a URL is the web's path, not the repository's: a dependency bot's "compare/abc...def"
  // and ".../blob/main/CHANGELOG.md" were reported as missing files on 251 of 4,796 real commits.
  const text = raw.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, " ");
  const found = new Set();
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim();
    if (/^[\w.@-]+(\/[\w.@ -]+)+\.[a-z0-9]+$/i.test(t)) found.add(t);
  }
  for (const m of text.matchAll(/(?<![`\w/.])((?:[\w.@-]+\/)+[\w.@-]+\.[a-z0-9]+)(?![\w`])/gi)) found.add(m[1]);
  return [...found].filter(isRepositoryPath);
}

const sentencesWith = (text, re) =>
  text
    .split(/(?<=[.!?])\s+|(?<=[。！？।])\s*|\n+/)
    .filter((s) => re.test(s) && !/^\s*(Co-Authored-By|Claude-Session|Signed-off-by)/.test(s));

/** Added lines that start a test, in files the path rules call source. */
function inlineTests(diff, source) {
  const patch = typeof diff.patch === "function" ? diff.patch() : null;
  if (!patch) return [];
  const starts = /^\s*#\[(?:\w+::)?test\]|^\s*#\[cfg\(test\)\]|^\s*(?:async\s+)?def test_\w+\(|^\s*class Test\w*[(:]/;
  return source.filter((f) => (patch.get(f.path)?.added ?? []).some((l) => starts.test(l))).map((f) => f.path);
}

/** True when every changed line in the given files is a comment. False when the patch cannot be read. */
function commentsOnly(diff, files) {
  const patch = typeof diff.patch === "function" ? diff.patch() : null;
  if (!patch) return false;
  return files.every((f) => {
    const p = patch.get(f.path);
    return p && [...p.added, ...p.removed].every((l) => !l.trim() || isComment(l));
  });
}

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
  // Template text is not the author's claim: HTML comments (a pull request template's instructions) and
  // unchecked checklist items ("- [ ] tests are included") say what a reviewer should look for.
  const body = text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^\s*[-*+]\s*\[ \].*$/gm, "")
    .replace(/^\s*(Co-Authored-By|Claude-Session|Signed-off-by):.*$/gim, "");
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
    // A test written inside a source file (a Rust `#[test]`, a Python `def test_`) is a test the path rules cannot see.
    const inline = written.length ? [] : inlineTests(diff, source);
    if (inline.length) {
      add("ok", `tests claimed and ${inline.length === 1 ? "a test is" : "tests are"} added inside ${inline.slice(0, 2).join(", ")}`, "diff-tests-found");
    } else if (!written.length) {
      add("warn", `the message says tests were added; no test file gains a line in this change (${files.length} file${files.length === 1 ? "" : "s"} counted, ${tests.length} of them under a test path)`, "diff-tests-missing");
    } else {
      add("ok", `tests claimed and ${written.length} test ${written.length === 1 ? "file gains" : "files gain"} lines`, "diff-tests-found");
    }
  }

  // 2. A claim that only documentation changed, with source or tests in the diff. "Comments only" is
  // checked on the lines themselves: a comment typo in a test file is a comment-only change.
  const docsClaim = DOCS_ONLY_CLAIM.exec(claims);
  if (docsClaim) {
    const other = [...source, ...tests];
    if (other.length && /comment/i.test(docsClaim[0]) && !/docs?|documentation|readme/i.test(docsClaim[0]) && commentsOnly(diff, other)) {
      add("ok", "comments only, and every changed line in the code files is a comment", "diff-docs-only-ok");
    } else if (other.length) {
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
    const before = s.slice(Math.max(0, m.index - 28), m.index);
    if (!CHANGE_VERB.test(before)) continue;
    // "remove a rule by editing one file" says how a future change goes, not how many files this one touched.
    if (/\b(by|can|could|will|would|should|lets?|allows?|need|needs|to|if|when|once)\b/i.test(before)) continue;
    if (claimed !== files.length) add("warn", `the message says ${m[1]} file${claimed === 1 ? "" : "s"}; the change has ${files.length}: "${s.trim().slice(0, 70)}"`, "diff-file-count-mismatch");
    else add("ok", `the stated file count matches the change: ${files.length}`, "diff-file-count-ok");
  }

  // 4. A path named in the message that is neither in the change nor in the repository.
  // A path that exists but is untouched is ordinary context, so only a broken reference is
  // reported: that is the shape a renamed or invented file leaves behind.
  // A renamed file is in the change under both its names.
  const inDiff = new Set(files.flatMap((f) => (f.oldPath ? [f.path, f.oldPath] : [f.path])));
  const broken = namedPaths(body).filter((p) => !inDiff.has(p) && !existsSync(join(cwd, p)));
  if (broken.length) {
    add("warn", `the message names ${broken.length === 1 ? "a path" : "paths"} that ${broken.length === 1 ? "is" : "are"} not in this change and not in the repository: ${broken.slice(0, 3).join(", ")}`, "diff-path-missing");
  }

  // 5. The direction of an operation: added against removed, and the other claims that need
  // the changed lines. Each is silent unless the message asserts something the change contradicts.
  const body2 = body.replace(/^\s*(Co-Authored-By|Claude-Session|Signed-off-by):.*$/gim, "");
  findings.push(...directionChecks(body2, diff, { isDocPath }));
  findings.push(...fixDocsOnly(text, diff));
  findings.push(...breakingClaim(text, diff));
  // 6. What the author claims and no diff can show. Listed so the reader sees the split.
  findings.push(...claimedOnly(text));

  return findings;
}
