// The pull request path of `check`: the API document parser, the fetch through a token, the
// sticky comment (created once, updated after), and the github output format. A local
// node:http server stands in for api.github.com; nothing here reaches the network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COMMENT_MARKER, analyse, commentBody, prBodyFrom, render } from "../bin/check.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "bin", "check.mjs");
const fixture = readFileSync(join(root, "test", "fixtures", "pr.json"), "utf8");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

test("prBodyFrom reads the body of a pull request document; a null body is an empty description", () => {
  assert.match(prBodyFrom(fixture), /^feat\(export\): monthly bookings as CSV\r\n/);
  assert.equal(prBodyFrom('{"number": 1, "body": null}'), "");
  assert.equal(prBodyFrom("{}"), "");
});

test("the fixture description passes the check with its CRLF line endings", () => {
  const r = analyse(prBodyFrom(fixture).replace(/\r\n/g, "\n"));
  assert.equal(r.findings.some((f) => f.level === "error"), false);
});

test("render with the github format turns errors and warnings into workflow commands", () => {
  const out = render(analyse("feat: x\n\nWe made it 40 percent faster.\n"), "github");
  assert.match(out, /^::error title=product-engineer::no "For the customer:" block$/m);
  assert.match(out, /^::warning title=product-engineer::1 sentence with a number/m);
  assert.match(out, /^1 error, 1 warning$/m);
  assert.doesNotMatch(render(analyse("feat: x\n"), "text"), /::error/);
});

test("commentBody carries the marker, the verdict, and the template only when the block is missing", () => {
  const missing = commentBody(analyse("feat: nothing\n"), version);
  assert.ok(missing.startsWith(COMMENT_MARKER));
  assert.match(missing, /has no "For the customer" block/);
  assert.match(missing, /```\nFor the customer:\nWhat changed: </);
  assert.match(missing, new RegExp(`product-engineer ${version.replace(/\\./g, "\\\\.")}`));
  const present = commentBody(analyse("feat: x\n\nFor the customer:\nWhat changed: A.\n"), version);
  assert.match(present, /block is present/);
  assert.doesNotMatch(present, /Paste this/);
  assert.match(present, /- warning: "Why it matters:" missing/);
  assert.match(commentBody(analyse("Merge branch 'x'\n"), version), /skipped/);
});

/** A fake GitHub API: one pull request, a comments list that starts empty, records every write. */
function fakeApi() {
  const state = { comments: [], writes: [] };
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const send = (status, body) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (req.headers.authorization !== "Bearer t0k3n") return send(401, { message: "bad credentials" });
      const url = req.url.split("?")[0];
      if (req.method === "GET" && url === "/repos/o/r/pulls/7") return send(200, JSON.parse(fixture));
      if (req.method === "GET" && url === "/repos/o/r/pulls/8") return send(200, { number: 8, body: "feat: no block here" });
      if (req.method === "GET" && url === "/repos/o/r/issues/8/comments") return send(200, state.comments);
      if (req.method === "POST" && url === "/repos/o/r/issues/8/comments") {
        const c = { id: 101, body: JSON.parse(raw).body };
        state.comments.push(c);
        state.writes.push(["POST", c.body]);
        return send(201, c);
      }
      if (req.method === "PATCH" && url === "/repos/o/r/issues/comments/101") {
        state.comments[0].body = JSON.parse(raw).body;
        state.writes.push(["PATCH", state.comments[0].body]);
        return send(200, state.comments[0]);
      }
      send(404, { message: `no route for ${req.method} ${url}` });
    });
  });
  server.keepAliveTimeout = 100;
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, state, port: server.address().port })));
}

// Async on purpose: the fake API runs in this process, and a blocking spawn would never let it answer.
const runWith = (env, ...args) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, "check", ...args], { env: { PATH: process.env.PATH, ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}), ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });

test("--pr fetches through the API with a token, then --comment creates the comment once and updates it after", async () => {
  const api = await fakeApi();
  const env = { GITHUB_TOKEN: "t0k3n", GITHUB_REPOSITORY: "o/r", GITHUB_API_URL: `http://127.0.0.1:${api.port}` };
  try {
    const ok = await runWith(env, "--pr", "7");
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /no errors/);

    const first = await runWith(env, "--pr", "8", "--comment", "--format", "github");
    assert.equal(first.status, 1, first.stdout + first.stderr);
    assert.match(first.stdout, /::error title=product-engineer::no "For the customer:" block/);
    assert.match(first.stdout, /comment created on pull request #8/);
    assert.equal(api.state.writes.length, 1);
    assert.equal(api.state.writes[0][0], "POST");
    assert.ok(api.state.writes[0][1].startsWith(COMMENT_MARKER));

    const second = await runWith(env, "--pr", "8", "--comment");
    assert.match(second.stdout, /comment updated on pull request #8/);
    assert.equal(api.state.writes.length, 2);
    assert.equal(api.state.writes[1][0], "PATCH");
    assert.equal(api.state.comments.length, 1, "one sticky comment, never two");

    const denied = await runWith({ ...env, GITHUB_TOKEN: "wrong" }, "--pr", "8");
    assert.equal(denied.status, 2);
    assert.match(denied.stderr, /GET \/pulls\/8: 401/);
  } finally {
    api.server.close();
  }
});

test("--comment without a token reports a warning and keeps the check's exit code", async () => {
  const api = await fakeApi();
  try {
    // The description is fetched with the token; the comment call sees a token that the fake API refuses.
    const env = { GITHUB_TOKEN: "t0k3n", GITHUB_REPOSITORY: "o/r", GITHUB_API_URL: `http://127.0.0.1:${api.port}` };
    const r = await runWith(env, "--pr", "7", "--comment", "--warn");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /warn  could not post the comment: GET \/issues\/7\/comments/);
    const noPr = await runWith(env, "--stdin", "--comment");
    assert.equal(noPr.status, 2);
    assert.match(noPr.stderr, /--comment needs --pr/);
  } finally {
    api.server.close();
  }
});
