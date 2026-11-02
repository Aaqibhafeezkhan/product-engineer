import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record, skillEvidence, toolCalls, parseStream } from "../evals/record-run.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const line = (o) => JSON.stringify(o);
const assistant = (...blocks) => line({ type: "assistant", message: { content: blocks } });
const use = (name, input) => ({ type: "tool_use", id: `t_${name}`, name, input });
const RESULT = { type: "result", subtype: "success", result: "done", num_turns: 4, total_cost_usd: 0.12, usage: { cache_creation_input_tokens: 900 }, modelUsage: { "claude-x": {} } };

const loaded = [
  line({ type: "system", subtype: "init" }),
  assistant({ type: "text", text: "I will use the skill" }, use("Skill", { skill: "product-engineer" })),
  assistant(use("Read", { file_path: "/w/.claude/skills/product-engineer/references/commit-template.md" }), use("Bash", { command: "git commit -m x" })),
  line(RESULT),
].join("\n");
const unloaded = [assistant(use("Bash", { command: "ls" }), use("Edit", { file_path: "a.js" })), line(RESULT)].join("\n");

test("tool calls are read in order with a short summary of each input", () => {
  const calls = toolCalls(parseStream(loaded).events);
  assert.deepEqual(calls.map((c) => [c.n, c.name, c.input]), [
    [1, "Skill", "product-engineer"],
    [2, "Read", "/w/.claude/skills/product-engineer/references/commit-template.md"],
    [3, "Bash", "git commit -m x"],
  ]);
});

test("a skill is loaded when the Skill tool names it or a file of it is read, and not otherwise", () => {
  assert.equal(record(loaded, "product-engineer").tools.skillLoaded, true);
  assert.equal(record(unloaded, "product-engineer").tools.skillLoaded, false);
  assert.equal(record(unloaded, "product-engineer").tools.callCount, 2);
  // Another skill's name, or a bare condition with no skill, is not evidence.
  assert.equal(record(loaded, "customer-block").tools.skillLoaded, false);
  assert.equal(record(loaded, "").tools.skillLoaded, null);
  assert.deepEqual(skillEvidence([{ name: "Skill", input: "plugin:product-engineer" }], "product-engineer").length, 1);
});

test("the result event is kept whole and a line that is not JSON is counted, not fatal", () => {
  const r = record(`not json\n${loaded}\n`, "product-engineer");
  assert.equal(r.tools.skippedLines, 1);
  assert.deepEqual(r.result, RESULT);
  assert.equal(record(unloaded.split("\n")[0], "").result, null);
});

// The whole recording path of evals/run.sh with a fake `claude` that prints a canned stream and commits a change.
// No model is called. POSIX shell only, like run.sh.
test("run.sh stores the stream, the tool calls, the load signal and the final diff", { skip: process.platform === "win32" && "run.sh needs a POSIX shell" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-record-"));
  try {
    const bin = join(dir, "bin");
    mkdirSync(bin);
    const stream = join(dir, "stream.jsonl");
    writeFileSync(stream, `${loaded}\n`);
    writeFileSync(
      join(bin, "claude"),
      `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "9.9.9 (Fake)"; exit 0; fi\nprintf 'changed by the fake agent\\n' > fake-output.txt\ngit add -A >/dev/null\ngit -c user.name=F -c user.email=f@example.com commit -q -m "feat: fake" -m "For the customer:" -m "What changed: x"\ncat "${stream}"\n`,
    );
    chmodSync(join(bin, "claude"), 0o755);
    const out = join(dir, "out");
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, PE_EVAL_OUT: out, PE_EVAL_YES: "1" };
    const r = spawnSync("sh", [join(root, "evals", "run.sh"), "01", "skill"], { env, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const task = execFileSync("ls", [join(root, "evals", "tasks")], { encoding: "utf8" }).split("\n").find((n) => n.startsWith("01"));
    const arm = join(out, task, "skill");
    for (const f of ["stream.jsonl", "transcript.json", "tool-calls.json", "final.diff", "meta.json", "final.md", "commit.txt"]) assert.ok(existsSync(join(arm, f)), `${f} missing`);
    assert.deepEqual(JSON.parse(readFileSync(join(arm, "transcript.json"), "utf8")), RESULT);
    const meta = JSON.parse(readFileSync(join(arm, "meta.json"), "utf8"));
    assert.equal(meta.skill_loaded, true);
    assert.equal(meta.tool_calls, 3);
    assert.equal(meta.turns, 4);
    assert.match(readFileSync(join(arm, "final.diff"), "utf8"), /\+\+\+ b\/fake-output\.txt[\s\S]*\+changed by the fake agent/);
    assert.match(readFileSync(join(arm, "commit.txt"), "utf8"), /^For the customer:$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a single plain json object with the result fields still records", () => {
  const r = record(`${line({ result: "ok", num_turns: 2, total_cost_usd: 0.1 })}\n`, "");
  assert.equal(r.result.num_turns, 2);
});
