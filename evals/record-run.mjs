#!/usr/bin/env node
// Turns one headless Claude Code run, recorded as `--output-format stream-json --verbose` lines, into the
// files evals/run.sh stores for that run:
//
//   transcript.json  the final `result` event, the same object `--output-format json` prints, so score.mjs,
//                    by-model.mjs and skill-load-signal.mjs read it unchanged
//   tool-calls.json  every tool call the agent made in order, and whether the skill was loaded
//
//   node evals/record-run.mjs <stream.jsonl> <out-dir> [<skill-name>]
//
// "Loaded" means the agent called the Skill tool with the skill's name, or read a file at
// .../skills/<skill-name>/... . Both are things the agent did, read from its own tool calls; neither is
// inferred from cost. A skill that was never called and never read is reported as not loaded.
// Node built-ins only.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const clip = (s, n = 200) => (String(s).length > n ? `${String(s).slice(0, n)}...` : String(s));

/** One short, comparable summary of a tool call's input. */
function summarise(name, input = {}) {
  if (name === "Skill") return input.skill ?? input.command ?? "";
  if (name === "Bash") return clip(input.command ?? "");
  if ("file_path" in input) return input.file_path;
  if ("path" in input) return input.path;
  if ("pattern" in input) return clip(input.pattern);
  return clip(Object.keys(input).join(","));
}

/** Parses stream-json lines; a line that is not JSON is skipped and counted, never fatal. */
export function parseStream(text) {
  const events = [];
  let skipped = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      skipped++;
    }
  }
  return { events, skipped };
}

export function toolCalls(events) {
  const calls = [];
  for (const e of events) {
    if (e?.type !== "assistant") continue;
    for (const block of e.message?.content ?? []) {
      if (block?.type !== "tool_use") continue;
      calls.push({ n: calls.length + 1, name: block.name, input: summarise(block.name, block.input) });
    }
  }
  return calls;
}

/** Evidence that a skill was loaded: the calls that name it. Empty means not loaded. */
export function skillEvidence(calls, skill) {
  if (!skill) return [];
  const marker = `skills/${skill}/`;
  return calls.filter(
    (c) =>
      (c.name === "Skill" && (c.input === skill || c.input.endsWith(`:${skill}`))) ||
      ((c.name === "Read" || c.name === "Bash") && c.input.includes(marker)),
  );
}

export function record(streamText, skill) {
  const { events, skipped } = parseStream(streamText);
  // A plain `--output-format json` object (no "type": "result", but the same fields) is accepted too, so a CLI or a
  // stand-in that prints one object still records.
  const result = [...events].reverse().find((e) => e?.type === "result") ?? [...events].reverse().find((e) => e && typeof e === "object" && !e.type && ("result" in e || "num_turns" in e || "total_cost_usd" in e)) ?? null;
  const calls = toolCalls(events);
  const evidence = skillEvidence(calls, skill);
  return {
    result,
    tools: { skill: skill || null, skillLoaded: skill ? evidence.length > 0 : null, evidence, callCount: calls.length, skippedLines: skipped, calls },
  };
}

function main(argv) {
  const [stream, out, skill] = argv;
  if (!stream || !out) {
    console.error("usage: node evals/record-run.mjs <stream.jsonl> <out-dir> [<skill-name>]");
    return 2;
  }
  const { result, tools } = record(readFileSync(stream, "utf8"), skill);
  if (result) writeFileSync(join(out, "transcript.json"), `${JSON.stringify(result)}\n`);
  writeFileSync(join(out, "tool-calls.json"), `${JSON.stringify(tools, null, 2)}\n`);
  if (!result) {
    console.error(`no result event in ${stream}: transcript.json was not written`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
