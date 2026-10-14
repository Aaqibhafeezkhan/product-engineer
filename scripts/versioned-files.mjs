// The list of files that state the package version, shared by release.mjs and release-gate.mjs
// so the release cannot set a file the gate does not check, or the other way round.
// A repository without scripts/versioned-files.json has an empty list. Node built-ins only.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const LIST = "scripts/versioned-files.json";

/** @returns {{ path: string, pattern: string }[]} */
export function versionedFiles(root) {
  const file = join(root, LIST);
  if (!existsSync(file)) return [];
  const { files } = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(files)) throw new Error(`${LIST}: "files" must be an array`);
  for (const f of files) {
    if (typeof f?.path !== "string" || typeof f?.pattern !== "string") throw new Error(`${LIST}: every entry needs "path" and "pattern"`);
    if (new RegExp(`${f.pattern}|`).exec("").length < 2) throw new Error(`${LIST}: ${f.path}: the pattern has no capture group for the version`);
  }
  return files;
}

const match = (text, entry) => new RegExp(entry.pattern, "md").exec(text);

/** The version the entry's pattern captures in text, or null when the pattern matches nothing. */
export function readVersion(text, entry) {
  return match(text, entry)?.[1] ?? null;
}

/** Text with the captured version replaced, or null when the pattern matches nothing. */
export function writeVersion(text, entry, version) {
  const m = match(text, entry);
  if (!m) return null;
  const [start, end] = m.indices[1];
  return text.slice(0, start) + version + text.slice(end);
}
