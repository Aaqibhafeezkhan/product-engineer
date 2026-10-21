import { execFileSync } from "node:child_process";
import { acceptedHeadings, preferredHeadings, headingWithText, isHeading, normalise } from "./headings.mjs";

function commitBody(sha, cwd) {
  return execFileSync("git", ["show", "-s", "--format=%B", sha], { cwd, encoding: "utf8" });
}

function commitSubject(sha, cwd) {
  return execFileSync("git", ["show", "-s", "--format=%s", sha], { cwd, encoding: "utf8" }).trim();
}

function customerBlock(message, cwd) {
  const lines = message.split(/\r?\n/);
  const sets = acceptedHeadings(cwd);
  let heading;
  let start = -1;
  for (let i = 1; i < lines.length; i++) {
    const found = sets.find((set) => isHeading(lines[i], set.block));
    if (found) {
      heading = found;
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const block = [];
  for (let i = start + 1; i < lines.length && lines[i].trim() !== ""; i++) block.push(lines[i]);
  const changed = block.find((line) => headingWithText(line, heading.what));
  if (!changed) return null;
  const changedText = changed.trim().slice(normalise(heading.what).length).trim();
  const why = block.find((line) => headingWithText(line, heading.why));
  const whyText = why ? why.trim().slice(normalise(heading.why).length).trim() : "";
  if (!changedText) return null;
  return { changed: changedText, why: whyText };
}

/** Render customer-facing notes from a Git revision range. */
export function notes(range, cwd = process.cwd()) {
  const preferred = preferredHeadings(cwd);
  let shas;
  try {
    shas = execFileSync("git", ["rev-list", "--no-merges", range], { cwd, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  } catch (err) {
    const detail = err instanceof Error ? err.message.split("\n")[0] : String(err);
    throw new Error(`cannot read commit range "${range}": ${detail}`);
  }
  const entries = [];
  let withoutBlock = 0;
  for (const sha of shas) {
    const body = commitBody(sha, cwd);
    const block = customerBlock(body, cwd);
    if (!block) {
      withoutBlock++;
      continue;
    }
    entries.push({ ...block, subject: commitSubject(sha, cwd) });
  }
  const output = [`# Customer notes`, ""];
  if (!entries.length) output.push("No customer-facing changes found.", "");
  for (const entry of entries) {
    output.push(`- ${entry.changed}`);
    if (entry.why) output.push(`  - ${preferred.why} ${entry.why}`);
  }
  if (withoutBlock) {
    if (entries.length) output.push("");
    output.push(`${withoutBlock} commits without a block`);
  }
  return output.join("\n");
}
