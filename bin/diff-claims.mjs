// Claims about what a change DID, checked against the change itself.
//
// bin/diff.mjs counts files. This module reads the direction of an operation (added against
// removed) and a few other facts a diff shows by itself. It is precision-first: a finding is
// made only when the message asserts one thing and the change shows the opposite, and any
// claim the diff cannot decide is left alone, or listed as "claimed only" at info level.
//
// What a diff can decide here:
//   - a file named as added that the change deletes, or named as removed that the change adds
//   - a code identifier named as removed that only appears on added lines, or the reverse
//   - a security concept (authentication, permissions, CSRF...) named as removed or added,
//     when the changed lines show it only on the opposite side
//   - a bug-fix claim over a change that contains documentation files and nothing else
//   - "no breaking changes" over a change that removes an exported name and defines no
//     name like it again
// What it cannot decide, and says so: that tests ran or passed, that something was verified
// by hand, that a performance number is true, that an exported name is really public API.
//
// English only. A message in another language is not read by these checks, so it passes
// silently; that is a miss, never a false alarm.

const FILE_FILLER = "the|a|an|old|new|unused|dead|legacy|redundant|obsolete|deprecated|duplicate|duplicated|stale|file|script|module|directory|folder|helper|config|fixture";
const SYMBOL_FILLER = `${FILE_FILLER}|all|any|every|function|functions|method|methods|class|component|dependency|import|option|flag|field|column|endpoint|route|hook|test|tests|call|calls|usage|usages|support|for|of|to|reference|references|variable|constant|setting|parameter|argument|type|property|export|alias|command|check|checks|guard`;

const ADD_VERB = "add(?:ed|s|ing)?|creat(?:e|ed|es|ing)|introduc(?:e|ed|es|ing)";
// "drop" is not here: in Rust and in lock code it means releasing a value ("drop the waker"), not removal.
const REMOVE_VERB = "remov(?:e|ed|es|ing)|delet(?:e|ed|es|ing)";
const isRemove = (verb) => new RegExp(`^(?:${REMOVE_VERB})$`, "i").test(verb);

// A verb in a position that is not a claim about this change: negated, an intention, a condition.
const NOT_A_CLAIM = /\b(not|never|without|instead of|rather than|n't|to|will|would|should|can|could|may|might|must|need|needs|later|future|planning|plan|todo|before|until|unless|if|whether|when|once|after)\s+(?:\w+\s+){0,2}$/i;

const FILE_EXT = "md|mdx|json|jsonc|js|mjs|cjs|ts|tsx|jsx|mts|cts|py|go|rs|rb|java|kt|swift|c|h|cpp|hpp|cs|php|sh|bash|zsh|yml|yaml|toml|txt|html|css|scss|sql|lock|xml|ini|cfg|conf|env|svg|png|gif|jpg";
const PATH_SHAPE = new RegExp(`^(?:[\\w.@-]+/)+[\\w.@-]+$|^[\\w.@-]+\\.(?:${FILE_EXT})$`, "i");
const IDENT_SHAPE = /^(?:--?)?[A-Za-z_$][\w$.-]{1,60}(?:\(\))?$/;
const KEYWORDS = new Set("true false null undefined this self none else elif for while return import from const let var function class async await new delete default break continue try catch finally throw with yield typeof void not and or def pub".split(" "));

// A line that is only a comment. `#[derive]` and `#include` begin with a hash and are code.
export const isComment = (line) => /^\s*(\/\/|\*|\/\*|--|;|<!--)/.test(line) || (/^\s*#/.test(line) && !/^\s*#\s*(\[|!\[|include\b|define\b|if\b|ifdef\b|ifndef\b|else\b|elif\b|endif\b|pragma\b|import\b|undef\b|region\b|endregion\b|error\b|warning\b)/.test(line));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Sentences of the text, without trailer lines and quoted replies. */
function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+|(?<=[。！？।])\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s && !/^(Co-Authored-By|Claude-Session|Signed-off-by)/i.test(s) && !s.startsWith(">"));
}

/** Operation claims: [{ verb, remove, object, kind: "path" | "identifier", sentence }]. */
export function operationClaims(text) {
  // A revert describes the commit it undoes: "removed `Drop`" there is the old change, not this one.
  if (/^\s*(?:[\w./-]+(?:\([^)]*\))?!?:\s*)?revert\b/i.test(text)) return [];
  const prepared = text.replace(/```[\s\S]*?```/g, " ").replace(/"[^"\n]{0,120}"|“[^”\n]{0,120}”/g, " ");
  const out = [];
  for (const sentence of sentences(prepared)) {
    const re = new RegExp(`\\b(${ADD_VERB}|${REMOVE_VERB})\\s+((?:(?:${SYMBOL_FILLER})\\s+){0,3})(?:\`([^\`\\n]+)\`|((?:[\\w.@-]+/)+[\\w.@-]+\\.[a-z0-9]{1,6})\\b)`, "gi");
    for (const m of sentence.matchAll(re)) {
      if (NOT_A_CLAIM.test(sentence.slice(Math.max(0, m.index - 30), m.index))) continue;
      // "draft-2020-12 (which removed `additionalItems`)": a past event told about something else, not this change.
      if (/\b(which|that|who)\s+$/i.test(sentence.slice(Math.max(0, m.index - 12), m.index)) && /ed$/i.test(m[1])) continue;
      const object = (m[3] ?? m[4]).trim();
      const fillers = m[2].trim().split(/\s+/).filter(Boolean);
      const prepositional = fillers.some((w) => /^(for|of|to|call|calls|usage|usages|import|reference|references|support|check|checks|guard|test|tests)$/i.test(w));
      const kind = PATH_SHAPE.test(object) ? "path" : IDENT_SHAPE.test(object) ? "identifier" : null;
      if (!kind) continue;
      out.push({ verb: m[1], remove: isRemove(m[1]), object, kind, prepositional, sentence });
    }
  }
  return out;
}

const count = (lines, re) => lines.reduce((n, l) => n + (!isComment(l) && re.test(l) ? 1 : 0), 0);

/** The changed lines of every non-documentation file: { added, removed } as flat arrays. */
function codeLines(patch, files, isDocPath) {
  const added = [];
  const removed = [];
  for (const f of files) {
    if (isDocPath(f.path)) continue;
    const p = patch.get(f.path) ?? (f.oldPath ? patch.get(f.oldPath) : undefined);
    if (!p) continue;
    added.push(...p.added);
    removed.push(...p.removed);
  }
  return { added, removed };
}

// Security concepts a reader treats as load-bearing. `claim` reads the message, `line` reads a
// changed line. The line patterns avoid "author" and friends.
const AUTH = /(?<![A-Za-z])auth(?:entic\w*|oriz\w*|oris\w*)?(?![A-Za-z])|(?<=[a-z_])Auth(?:entic\w*|oriz\w*)?(?![a-z])/;
const CONCEPTS = [
  { name: "authentication", claim: /auth(?:entication|orization|orisation|orize|enticate)?/i, line: AUTH },
  { name: "permission", claim: /permissions?/i, line: /permission/i },
  { name: "CSRF", claim: /csrf/i, line: /csrf|xsrf/i },
  { name: "rate limiting", claim: /rate[- ]?limit(?:ing|s|er)?/i, line: /rate[-_ ]?limit/i },
  { name: "sanitization", claim: /sanitiz\w+|sanitis\w+/i, line: /sanitiz|sanitis|escapeHtml/i },
  { name: "encryption", claim: /encrypt\w*/i, line: /encrypt/i },
];

/**
 * The checks that need to know how a change moved: status of each file and, for the symbol
 * checks, the changed lines. diff.files carries { path, status, oldPath }; diff.patch() returns
 * Map<path, { added: string[], removed: string[] }> or null when the patch could not be read.
 */
export function directionChecks(body, diff, { isDocPath }) {
  const findings = [];
  const add = (level, message, code) => findings.push({ level, message, code });
  const files = diff.files;
  const claims = operationClaims(body);
  if (!claims.length && !/(?:^|\W)(?:remov|delet|drop|add|creat|introduc)/i.test(body)) return findings;

  // 1. A file named as added that the change deletes, or named as removed that the change adds.
  for (const c of claims.filter((x) => x.kind === "path" && !x.prepositional)) {
    const hits = files.filter((f) => f.path === c.object || (!c.object.includes("/") && f.path.endsWith(`/${c.object}`)));
    if (hits.length !== 1) continue;
    const f = hits[0];
    if (!c.remove && f.status === "D") add("warn", `the message says it ${c.verb.toLowerCase()} \`${c.object}\`; the change deletes that file`, "diff-file-operation");
    else if (c.remove && f.status === "A") add("warn", `the message says it ${c.verb.toLowerCase()} \`${c.object}\`; the change adds that file`, "diff-file-operation");
    else if ((!c.remove && f.status === "A") || (c.remove && f.status === "D")) add("ok", `\`${c.object}\` is ${c.remove ? "deleted" : "added"}, as the message says`, "diff-file-operation-ok");
  }

  const symbolClaims = claims.filter((x) => x.kind === "identifier" && !KEYWORDS.has(x.object.replace(/\(\)$/, "")));
  const concepts = [];
  for (const sentence of sentences(body.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ").replace(/"[^"\n]{0,120}"/g, " "))) {
    const re = new RegExp(`\\b(${ADD_VERB}|${REMOVE_VERB})\\s+(?:(?:${SYMBOL_FILLER})\\s+){0,3}(${CONCEPTS.map((k) => k.claim.source).join("|")})\\b`, "gi");
    for (const m of sentence.matchAll(re)) {
      if (NOT_A_CLAIM.test(sentence.slice(Math.max(0, m.index - 30), m.index))) continue;
      const concept = CONCEPTS.find((k) => new RegExp(`^(?:${k.claim.source})$`, "i").test(m[2]));
      if (concept) concepts.push({ verb: m[1], remove: isRemove(m[1]), concept });
    }
  }
  if (!symbolClaims.length && !concepts.length) return findings;

  const patch = typeof diff.patch === "function" ? diff.patch() : null;
  if (!patch) return findings;
  const { added, removed } = codeLines(patch, files, isDocPath);

  // 2. An identifier named as removed that only appears on added lines, or the reverse. Silent
  // when it appears on both sides (edited or moved) or on neither (the diff cannot say).
  const seen = new Set();
  // A name the message both adds and removes (a squash of several steps) has no single direction.
  const both = new Set(symbolClaims.filter((x) => symbolClaims.some((y) => y.object === x.object && y.remove !== x.remove)).map((x) => x.object));
  for (const c of symbolClaims) {
    if (both.has(c.object)) continue;
    const name = c.object.replace(/\(\)$/, "");
    const key = `${c.remove}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const re = new RegExp(`(?<![\\w$])${escapeRe(name)}(?![\\w$])`);
    const a = count(added, re);
    const r = count(removed, re);
    if (c.remove && a > 0 && r === 0) add("warn", `the message says it ${c.verb.toLowerCase()} \`${name}\`; in the change it appears on ${a} added line${a === 1 ? "" : "s"} and on no removed line`, "diff-symbol-direction");
    else if (!c.remove && r > 0 && a === 0) add("warn", `the message says it ${c.verb.toLowerCase()} \`${name}\`; in the change it appears on ${r} removed line${r === 1 ? "" : "s"} and on no added line`, "diff-symbol-direction");
    else if ((c.remove && r > 0 && a === 0) || (!c.remove && a > 0 && r === 0)) add("ok", `\`${name}\` moves the way the message says (${c.remove ? "removed" : "added"})`, "diff-symbol-direction-ok");
  }

  // 3. The same for a security concept written as a word rather than as code.
  for (const { verb, remove, concept } of concepts) {
    const a = count(added, concept.line);
    const r = count(removed, concept.line);
    if (remove && a > 0 && r === 0) add("warn", `the message says it ${verb.toLowerCase()} ${concept.name}; in the changed lines it appears on ${a} added line${a === 1 ? "" : "s"} and on no removed line`, "diff-concept-direction");
    else if (!remove && r > 0 && a === 0) add("warn", `the message says it ${verb.toLowerCase()} ${concept.name}; in the changed lines it appears on ${r} removed line${r === 1 ? "" : "s"} and on no added line`, "diff-concept-direction");
  }
  return findings;
}

// A bug-fix claim over a title or sentence. The conventional "fix(docs):" and wording that names
// documentation are excluded, because a documentation fix is a fix.
// Only a claim that names a defect. A bare "fix: syntax" over a documentation file is a documentation
// fix; 18 of 18 such titles in 4,796 real commits were exactly that.
const FIX_CLAIM = /\b(?:fix(?:e[sd])?|resolve[sd]?|patch(?:ed)?)\s+(?:the\s+|a\s+|an\s+)?(?:(?!(?:and|or|of|in|for|to)\b)[a-z-]+\s+){0,1}(?:bug|crash(?:es)?|exception|regression|deadlock|race condition|memory leak|panic|segfault|null[- ]pointer|infinite loop)\b/i;
const DOC_WORDS = /\b(docs?|documentation|readme|typos?|spelling|wording|comments?|changelog|guide|tutorials?|examples?|translations?|links?|badges?|markdown|license|licence|contributing|wiki|manual|description|text|copy)\b/i;
const PURE_DOC = /\.(md|mdx|markdown|rst|adoc)$/i;

export function fixDocsOnly(text, diff) {
  const files = diff.files;
  if (!files.length || !files.every((f) => PURE_DOC.test(f.path))) return [];
  const masked = text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ").replace(/"[^"\n]{0,120}"/g, " ");
  const lines = masked.split("\n").filter((l) => !/^\s*(Co-Authored-By|Signed-off-by|Claude-Session)/i.test(l));
  const claim = lines.map((l) => FIX_CLAIM.exec(l)).find(Boolean);
  if (!claim) return [];
  if (DOC_WORDS.test(masked)) return [];
  if (/^\s*(docs?|documentation|readme|changelog|typo|chore|ci|build|deps?)(\([^)]*\))?!?:/i.test(lines[0] ?? "")) return [];
  const named = files.slice(0, 3).map((f) => f.path).join(", ");
  return [{ level: "warn", message: `the message says it fixes a bug; every file in the change is documentation (${files.length}: ${named}${files.length > 3 ? ", and more" : ""}), so no code changed`, code: "diff-fix-docs-only" }];
}

// "No breaking changes" and its relatives. "not backwards compatible" and "BREAKING CHANGE:" are
// the opposite claim and are not matched.
// A bare "backwards compatible" is not matched: it is as often a hope ("so we can do it later in a
// backwards compatible way") as a claim. It must be stated about this change.
const NO_BREAK = /\b(?:no\s+(?:public\s+)?(?:breaking|api)\s+changes?|non[- ]breaking|not\s+a\s+breaking\s+change|(?:is|are|stays?|remains?|fully|completely|entirely|100%)\s+(?:fully\s+)?backwards?[- ]compatible|without\s+breaking\s+(?:anything|the\s+api|existing))\b/i;
const HYPOTHETICAL = /\b(future|could|can|would|should|might|later|ideally|hope|want|to make)\b/i;

const EXPORT_PATTERNS = [
  { ext: /\.(?:[cm]?[jt]sx?)$/i, re: /^\s*export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(?:function\*?|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/ },
  { ext: /\.(?:[cm]?[jt]sx?)$/i, re: /^\s*module\.exports\.([A-Za-z_$][\w$]*)\s*=/ },
  { ext: /\.py$/i, re: /^(?:async\s+)?(?:def|class)\s+([A-Za-z][\w]*)/ },
  { ext: /\.go$/i, re: /^func\s+([A-Z]\w*)\s*[(\[]/ },
  { ext: /\.rs$/i, re: /^\s*pub\s+(?:async\s+)?(?:fn|struct|enum|trait|const|type)\s+([A-Za-z_]\w*)/ },
];
const EXPORT_LIST = /^\s*export\s*\{([^}]*)\}/;
const INTERNAL_PATH = /(^|\/)(_[^/]*|internal|private|tests?|__tests__|spec|examples?|scripts?|vendor|node_modules)(\/|$)/i;

/** Exported names that the change removes and does not define again anywhere in the added lines. */
export function removedExports(patch, files) {
  const addedAll = [];
  for (const p of patch.values()) addedAll.push(...p.added);
  const gone = [];
  for (const f of files) {
    if (INTERNAL_PATH.test(f.path)) continue;
    const p = patch.get(f.path) ?? (f.oldPath ? patch.get(f.oldPath) : undefined);
    if (!p) continue;
    for (const line of p.removed) {
      const names = [];
      for (const { ext, re } of EXPORT_PATTERNS) {
        if (!ext.test(f.path)) continue;
        const m = re.exec(line);
        if (m) names.push(m[1]);
      }
      const list = EXPORT_LIST.exec(line);
      if (list && /\.[cm]?[jt]sx?$/i.test(f.path)) names.push(...list[1].split(",").map((s) => s.trim().split(/\s+as\s+/i).pop()).filter((s) => /^[A-Za-z_$][\w$]*$/.test(s)));
      for (const name of names) {
        const again = new RegExp(`(?<![\\w$])${escapeRe(name)}(?![\\w$])`);
        if (addedAll.some((l) => again.test(l))) continue;
        gone.push({ name, path: f.path });
      }
    }
  }
  return gone;
}

export function breakingClaim(text, diff) {
  const masked = text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ").replace(/"[^"\n]{0,120}"/g, " ");
  const line = masked.split("\n").find((l) => NO_BREAK.test(l) && !HYPOTHETICAL.test(l) && !/^\s*BREAKING[ -]CHANGE/.test(l));
  if (!line) return [];
  const patch = typeof diff.patch === "function" ? diff.patch() : null;
  if (!patch) return [];
  const gone = removedExports(patch, diff.files);
  if (!gone.length) return [];
  const shown = gone.slice(0, 3).map((g) => `\`${g.name}\` (${g.path})`).join(", ");
  return [{ level: "warn", message: `the message says nothing breaks; the change removes ${gone.length === 1 ? "an exported name" : `${gone.length} exported names`} and defines no name like it again: ${shown}${gone.length > 3 ? ", and more" : ""}. Check that it is not part of the public API`, code: "diff-breaking-export-removed" }];
}

// Claims that need an observation the diff cannot contain. Listed, never judged.
const CLAIMED_ONLY = [
  { what: "tests were run or pass", re: /\b(?:(?:all|the|our)\s+)?(?:unit\s+|integration\s+|e2e\s+|full\s+|existing\s+)?(?:tests?|specs?|suite|ci|build)\s+(?:all\s+)?(?:is\s+|are\s+|was\s+|were\s+)?(?:pass(?:ed|es|ing)?|green|succe(?:ed|eds|eded|ssful))\b|\b(?:ran|run|running|executed)\s+(?:the\s+|all\s+|our\s+)?(?:unit\s+|integration\s+|e2e\s+|full\s+|existing\s+)?(?:tests?|test suite|suite|ci)\b|\b\d+\s+(?:tests?|specs?)\s+pass/i },
  { what: "it was tested or verified by hand", re: /\b(?:manually|locally)\s+(?:tested|verified|confirmed)\b|\btested\s+(?:it\s+)?(?:manually|locally|by hand|on\b)|\b(?:verified|confirmed)\s+(?:on|in|that|with|locally|manually)\b|\bworks\s+(?:as expected|correctly|fine)\b|\bno\s+regressions?\b/i },
  { what: "a performance or size figure", re: /\b\d+(?:\.\d+)?\s?(?:%|x|×|ms|s)\s+(?:faster|slower|smaller|less|lower|more|cheaper)\b|\b(?:improves?|improved|boosts?|reduces?|reduced)\s+(?:the\s+)?(?:performance|latency|memory|startup|load time)\b/i },
];

export function claimedOnly(text) {
  const masked = text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ").replace(/"[^"\n]{0,120}"|“[^”\n]{0,120}”/g, " ");
  const out = [];
  for (const { what, re } of CLAIMED_ONLY) {
    const s = sentences(masked).find((x) => re.test(x) && !/\b(?:not|never|no|n't|didn't|could not|couldn't|unable)\b[^.]{0,30}\b(?:ran|run|test|verif|confirm|check)/i.test(x));
    if (s) out.push({ level: "info", message: `claimed by the author and not checkable from a diff (${what}): "${s.slice(0, 80)}"`, code: "diff-claimed-only" });
  }
  return out;
}
