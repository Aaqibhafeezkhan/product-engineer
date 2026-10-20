// The machine-readable form of a check result, for `product-engineer check --format json`:
//   { ok, findings: [{ level, code, message }], readability }
// `ok` is true exactly when the process exits 0: no error finding, or --warn. `code` is a stable
// kebab-case name for the kind of finding, set where the finding is made, so an editor or dashboard
// can match on it without parsing the sentence in `message`. `readability` is the score of the
// customer block ({ name, score, band, lix, script }, or name null with a reason), and null when the
// message has no block. Zero dependencies.

/** The object printed for a result. `warn` mirrors the --warn flag, which forces exit 0. */
export function toJson(result, { warn = false } = {}) {
  const hasError = result.findings.some((f) => f.level === "error");
  return {
    ok: warn || !hasError,
    findings: result.findings.map((f) => ({ level: f.level, code: f.code ?? "other", message: f.message })),
    readability: result.readability ?? null,
  };
}

export function renderJson(result, opts) {
  return JSON.stringify(toJson(result, opts), null, 2);
}
