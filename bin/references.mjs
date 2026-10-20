// Resolve the evidence a message points at.
//
// Suggested by @raju_dandigam on dev.to (2026-09-12): can the observed evidence be made
// machine-checkable in CI, each claim linked to a test, a screenshot or a trace artifact, without
// turning the block into boilerplate? The second half of that question decides the design.
//
// A checker that DEMANDS a link gets links. It would be satisfied by a path typed from memory, and
// the first person to notice would be the reader who followed one and found nothing. So nothing here
// requires a reference: a message with none is reported as having none, at info level, and passes.
// What this does is resolve the references that are already there, which is the half that cannot be
// gamed into ceremony. A citation that does not resolve is worse than no citation, because it reads
// as evidence.
//
// Offline by design. A path is checked against the working tree; a run URL is checked for shape
// only. Nothing here makes a network request.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// A path must carry a directory separator and an extension before this will call it a path. "1.5x"
// and "v0.3.4" are not references, and a checker that flagged them would teach people to ignore it.
const FILE = /(?<![\w/@.-])((?:[\w.-]+\/)+[\w.-]+\.[A-Za-z][\w]{0,5})(?::(\d+))?(?![\w/])/g;
const RUN = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/(\d+)(?:\/[\w/]*)?/g;
// Written down rather than discovered: these are prose, not evidence, and they contain a slash and
// a dot often enough to be worth naming.
const NOT_A_PATH = /^(?:e\.g|i\.e|etc|vs)\.|^(?:https?|mailto):/i;

/** Every file path and CI run URL a message points at, in the order they appear, deduplicated. */
export function findReferences(text) {
  const seen = new Set();
  const refs = [];
  for (const m of text.matchAll(RUN)) {
    if (seen.has(m[0])) continue;
    seen.add(m[0]);
    refs.push({ kind: "run", raw: m[0], id: m[1] });
  }
  for (const m of text.matchAll(FILE)) {
    const raw = m[0];
    if (seen.has(raw) || NOT_A_PATH.test(raw)) continue;
    // A run URL contains no dotted file name, so the two patterns do not overlap; a path that is
    // part of a URL already matched above and is skipped here by the seen set of its whole URL.
    if (/^https?:\/\//.test(raw) || text.includes(`https://github.com/${raw}`)) continue;
    seen.add(raw);
    refs.push({ kind: "file", raw, path: m[1], line: m[2] ? Number(m[2]) : null });
  }
  return refs;
}

/**
 * Resolve each reference against the working tree. Returns the same objects with `resolved` and,
 * when it is false, `why` in the words a reader would need to fix it.
 */
export function resolveReferences(refs, opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  return refs.map((ref) => {
    if (ref.kind === "run") {
      // Shape only, and it says so. Whether the run exists is a question for the network, and a
      // checker that quietly went online would be a different tool from the one people installed.
      return { ...ref, resolved: true, note: "run URL shape is valid; existence not checked offline" };
    }
    const full = join(cwd, ref.path);
    if (!existsSync(full)) return { ...ref, resolved: false, why: "no such file here" };
    let stat;
    try {
      stat = statSync(full);
    } catch {
      return { ...ref, resolved: false, why: "cannot be read" };
    }
    if (stat.isDirectory()) return { ...ref, resolved: false, why: "is a directory, not a file" };
    if (ref.line === null) return { ...ref, resolved: true };
    // A line number is a claim about a file that keeps changing, which is exactly the claim worth
    // checking: it is the one that rots without anyone touching the sentence.
    const lines = readFileSync(full, "utf8").split("\n").length;
    if (ref.line > lines) return { ...ref, resolved: false, why: `line ${ref.line} is past the end of the file (${lines} lines)` };
    return { ...ref, resolved: true };
  });
}

/**
 * Findings for the CLI. `mode` is "warn" (default), "error" or "off".
 * A message with no references is never a failure, in any mode.
 */
export function referenceFindings(text, opts = {}) {
  const mode = opts.mode ?? "warn";
  if (mode === "off") return [];
  const refs = resolveReferences(findReferences(text), opts);
  if (refs.length === 0) {
    return [{ level: "info", message: "no file or run reference to resolve; the block is judged on what it says", code: "references-none" }];
  }
  const broken = refs.filter((r) => !r.resolved);
  if (broken.length === 0) {
    const one = refs.length === 1;
    return [{ level: "ok", message: `${refs.length} reference${one ? "" : "s"} resolve${one ? "s" : ""}`, code: "references-resolved" }];
  }
  return broken.map((r) => ({
    level: mode === "error" ? "error" : "warn",
    message: `cites ${r.raw}, which does not resolve: ${r.why}`,
    code: "references-broken",
  }));
}
