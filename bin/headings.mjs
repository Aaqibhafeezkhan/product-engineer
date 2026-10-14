// The block headings, read from one table so the check, the commit-msg hook and the skill
// cannot disagree. Zero dependencies, Node 22 or newer.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const TABLE = join(here, "..", "skills", "product-engineer", "references", "headings.md");
export const CONFIG = ".product-engineer.json";

/** Columns of the table, in order, mapped to the keys the check uses. */
const KEYS = ["language", "block", "what", "why", "automation", "notShipped"];

/** A fullwidth colon is the same heading as an ASCII one, and trailing space never matters. */
export const normalise = (s) => String(s).replace(/：/g, ":").trim();

/** The rows of the shipped table, English first. */
export function shippedHeadings(tablePath = TABLE) {
  const text = readFileSync(tablePath, "utf8");
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("| ") || line.startsWith("| language") || line.startsWith("|---")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => normalise(c));
    if (cells.length !== KEYS.length) continue;
    rows.push(Object.fromEntries(KEYS.map((k, i) => [k, cells[i]])));
  }
  return rows;
}

/** The English row: the default the skill teaches and the template pastes. */
export function defaultHeadings(tablePath = TABLE) {
  const rows = shippedHeadings(tablePath);
  return rows.find((r) => r.language === "en") ?? rows[0];
}

/**
 * The team's choice from .product-engineer.json: `headings` for a language the table does
 * not ship, or `language` to pick a row. Returns null when there is no file or no choice.
 * A malformed file is ignored rather than fatal: a commit hook must not fail on a typo
 * in a config file that is not the subject of the commit.
 */
export function configuredHeadings(cwd = process.cwd(), tablePath = TABLE) {
  const path = join(cwd, CONFIG);
  if (!existsSync(path)) return null;
  let config;
  try {
    config = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
  if (config && typeof config.headings === "object" && config.headings) {
    const base = defaultHeadings(tablePath);
    const own = { language: "custom" };
    for (const k of KEYS.slice(1)) own[k] = typeof config.headings[k] === "string" ? normalise(config.headings[k]) : base[k];
    return own;
  }
  if (typeof config?.language === "string") {
    return shippedHeadings(tablePath).find((r) => r.language === config.language) ?? null;
  }
  return null;
}

/**
 * Every heading set the check accepts: the configured one first, when there is one, then
 * the shipped rows. A repository with contributors writing in two languages needs both.
 */
export function acceptedHeadings(cwd = process.cwd(), tablePath = TABLE) {
  const shipped = shippedHeadings(tablePath);
  const own = configuredHeadings(cwd, tablePath);
  return own ? [own, ...shipped.filter((r) => r.block !== own.block)] : shipped;
}

/** The set whose heading the team writes: the configured one, otherwise English. */
export function preferredHeadings(cwd = process.cwd(), tablePath = TABLE) {
  return configuredHeadings(cwd, tablePath) ?? defaultHeadings(tablePath);
}

/** True when `line` is this heading, allowing a fullwidth colon and trailing space. */
export const isHeading = (line, heading) => normalise(line) === normalise(heading);

/** True when `line` opens this heading and carries text after it. */
export function headingWithText(line, heading) {
  const n = normalise(line);
  const h = normalise(heading);
  return n.startsWith(h) && n.slice(h.length).trim().length > 0;
}
