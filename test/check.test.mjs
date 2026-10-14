import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { analyse, exitCode, render, commentBody } from "../bin/check.mjs";
import { shippedHeadings } from "../bin/headings.mjs";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
const levels = (r) => r.findings.map((f) => f.level);
const has = (r, level, re) => r.findings.some((f) => f.level === level && re.test(f.message));

const full = `feat: export bookings

For the customer:
What changed: Accountants can download all bookings for a month as a spreadsheet.
Why it matters: They asked for this every month and typed it by hand.
Automation effect: The monthly copy-paste into the spreadsheet is gone.

Not shipped:
- Scheduled email of the export: nobody has asked; worth it when two customers do.
`;

test("the block gets a readability line as information only", () => {
  assert.ok(has(analyse(full), "info", /Flesch \d+/));
  assert.ok(has(analyse(full, { lang: "tr" }), "info", /Ateşman/));
  assert.equal(exitCode(analyse(full)), 0);
});

test("a full block passes with no errors", () => {
  const r = analyse(full);
  assert.equal(exitCode(r), 0);
  assert.ok(has(r, "ok", /block with "What changed:"/));
  assert.ok(has(r, "ok", /Why it matters/));
  assert.ok(has(r, "ok", /Automation effect:" present/));
  assert.ok(has(r, "ok", /Not shipped:" lists 1 item with reasons/));
  assert.ok(!levels(r).includes("error"));
});

test("a missing block is an error, or a warning with --warn", () => {
  const r = analyse("feat: thing without the block\n");
  assert.equal(exitCode(r), 1);
  assert.ok(has(r, "error", /no "For the customer:" block/));
  const w = analyse("feat: thing without the block\n", { warn: true });
  assert.equal(exitCode(w), 0);
  assert.ok(has(w, "warn", /no "For the customer:" block/));
});

test("a heading without What changed is an error; a missing Why it matters is a warning", () => {
  const r = analyse("feat: x\n\nFor the customer:\nWhy it matters: because\n");
  assert.ok(has(r, "error", /no "What changed:" line/));
  const w = analyse("feat: x\n\nFor the customer:\nWhat changed: People can export.\n");
  assert.equal(exitCode(w), 0);
  assert.ok(has(w, "warn", /Why it matters:" missing/));
});

test("an empty Automation effect line is an error; an omitted one is fine", () => {
  const r = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\nAutomation effect:\n");
  assert.ok(has(r, "error", /Automation effect:" is present but empty/));
  const ok = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n");
  assert.ok(has(ok, "ok", /omitted/));
});

test("Not shipped items need a thing and a reason", () => {
  const r = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n\nNot shipped:\n- just a thing\n");
  assert.ok(has(r, "warn", /items should read/));
  const e = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n\nNot shipped:\n");
  assert.ok(has(e, "warn", /has no items/));
});

test("numbers without a method or scope in the sentence are warned; numbers with one are not", () => {
  const bare = analyse("feat: x\n\nWe made it 40 percent faster.\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n");
  assert.ok(has(bare, "warn", /number and no method/));
  const counted = analyse("feat: x\n\nThe list opens in 0.8s instead of 3s, measured with the browser profiler.\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n");
  assert.ok(!has(counted, "warn", /number and no method/));
});

test("jargon in the block is warned unless explained on the line", () => {
  const j = analyse("feat: x\n\nFor the customer:\nWhat changed: The webhook is now idempotent.\nWhy it matters: B.\n");
  assert.ok(has(j, "warn", /jargon.*idempotent/));
  const e = analyse("feat: x\n\nFor the customer:\nWhat changed: The webhook is idempotent (doing it twice has the same result as once).\nWhy it matters: B.\n");
  assert.ok(!has(e, "warn", /jargon/));
});

test("merge, fixup, revert and [no-customer] are skipped", () => {
  for (const msg of ["Merge branch 'x'", "fixup! feat", "Revert \"feat\"", "chore: deps [no-customer]"]) {
    const r = analyse(msg + "\n");
    assert.equal(r.skipped, true, msg);
    assert.equal(exitCode(r), 0);
  }
});

test("the CLI exits 1 on a missing block, 0 with --warn, 2 on usage, and reads stdin", () => {
  const bad = spawnSync("node", [cli, "check", "-"], { input: "feat: nothing\n", encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /1 error/);
  const warn = spawnSync("node", [cli, "check", "-", "--warn"], { input: "feat: nothing\n", encoding: "utf8" });
  assert.equal(warn.status, 0);
  const good = spawnSync("node", [cli, "check", "-"], { input: full, encoding: "utf8" });
  assert.equal(good.status, 0, good.stdout + good.stderr);
  assert.match(good.stdout, /no errors/);
  const usage = spawnSync("node", [cli, "check", "/definitely/not/a/file.txt"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  const help = execFileSync("node", [cli, "--help"], { encoding: "utf8" });
  assert.match(help, /usage: product-engineer check/);
  assert.match(render(analyse(full)), /no errors/);
});

const testsAsEvidence = `fix: badge count

For the customer:
What changed: The bell no longer counts things the system handled by itself.
Why it matters: All 42 tests pass, so the count is right now.
`;

test("passing tests in the block are not an observation", () => {
  const r = analyse(testsAsEvidence);
  assert.ok(has(r, "warn", /offers passing tests as the evidence/));
});

test("a real observation next to the test count clears it", () => {
  const withObservation = testsAsEvidence.replace(
    "All 42 tests pass, so the count is right now.",
    "I watched the badge on a staging device: it stayed at two while the system wrote three of its own events. All 42 tests pass as well.",
  );
  const r = analyse(withObservation);
  assert.ok(!has(r, "warn", /offers passing tests as the evidence/));
});

test("describing added tests is not offering them as evidence", () => {
  const describes = full.replace(
    "What changed: Accountants can download all bookings for a month as a spreadsheet.",
    "What changed: Accountants can download all bookings for a month as a spreadsheet, covered by 7 new tests.",
  );
  assert.ok(!has(analyse(describes), "warn", /offers passing tests as the evidence/));
});

// --- the block may be written in the team's language ---

const trBlock = `feat(rapor): aylık rezervasyonları CSV olarak dışa aktar

Müşteri için:
Ne değişti: Muhasebeciler bir aylık rezervasyonu tablo olarak indirebiliyor.
Neden önemli: Bunu her ay elle yazıyorlardı.
`;

test("a shipped language is accepted with no configuration", () => {
  const r = analyse(trBlock);
  assert.equal(exitCode(r), 0, JSON.stringify(r.findings));
  assert.ok(has(r, "ok", /"Müşteri için:" block with "Ne değişti:"/));
  assert.ok(has(r, "ok", /"Neden önemli:" present/));
});

test("a fullwidth colon is the same heading", () => {
  const zh = "feat: x\n\n给客户：\n改动内容： 会计可以下载一个月的预订记录。\n";
  const r = analyse(zh);
  assert.equal(exitCode(r), 0, JSON.stringify(r.findings));
});

test("English is unchanged and is still what a missing block is named after", () => {
  const r = analyse("feat: nothing here\n");
  assert.ok(has(r, "error", /^no "For the customer:" block$/));
});

test("a team configures a heading the table does not ship", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-headings-"));
  writeFileSync(join(dir, ".product-engineer.json"), JSON.stringify({ headings: { block: "Für den Kunden:", what: "Was sich geändert hat:", why: "Warum es wichtig ist:" } }));
  const de = "feat: x\n\nFür den Kunden:\nWas sich geändert hat: Buchungen lassen sich laden.\nWarum es wichtig ist: Das war Handarbeit.\n";
  assert.equal(exitCode(analyse(de, { cwd: dir })), 0);
  // the shipped rows stay accepted beside it
  assert.equal(exitCode(analyse(full, { cwd: dir })), 0);
  // and a missing block is named after the team's own heading
  assert.ok(has(analyse("feat: nothing\n", { cwd: dir }), "error", /^no "Für den Kunden:" block$/));
  rmSync(dir, { recursive: true, force: true });
});

test("the paste template follows the configured heading", () => {
  const de = { language: "custom", block: "Für den Kunden:", what: "Was sich geändert hat:", why: "Warum es wichtig ist:", automation: "Automatisierungseffekt:", notShipped: "Nicht geliefert:" };
  const body = commentBody(analyse("feat: nothing\n", { headings: de }), "0.0.0", { headings: de });
  assert.match(body, /Für den Kunden:\nWas sich geändert hat: </);
  assert.doesNotMatch(body, /For the customer/);
});

test("the hook, the table and the check agree on every shipped heading", () => {
  const hook = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "commit-msg"), "utf8");
  for (const row of shippedHeadings()) {
    assert.ok(hook.includes(row.block.replace(/:$/, "")), `hook is missing ${row.block}`);
    assert.ok(hook.includes(row.what.replace(/:$/, "")), `hook is missing ${row.what}`);
    const message = `feat: x\n\n${row.block}\n${row.what} something a person notices.\n`;
    assert.equal(exitCode(analyse(message)), 0, `check rejects ${row.language}`);
  }
});

test("a block in a script the formulas cannot read gets a refusal, not a score", () => {
  const ja = "feat: x\n\nお客さまへ:\n変わったこと: 経理担当者が一か月分の予約を取得できます。\n";
  const r = analyse(ja);
  assert.equal(exitCode(r), 0, JSON.stringify(r.findings));
  assert.ok(has(r, "info", /not scored, because Japanese/));
  assert.ok(!has(r, "info", /Flesch 0/));
});

test("a sentence ends at an ideographic full stop too", () => {
  const ja = "feat: x\n\nお客さまへ:\n変わったこと: 経理担当者が3か月分の予約を取得できます。これは毎月の手作業でした。\n";
  const warn = analyse(ja).findings.find((f) => /sentence with a number/.test(f.message));
  assert.ok(warn, "the heuristic still fires");
  assert.ok(!warn.message.includes("これは毎月"), "the excerpt stops at the full stop instead of swallowing the block");
});

test("template command prints the block in English, --lang, and configured language", () => {
  const en = execFileSync("node", [cli, "template"], { encoding: "utf8" });
  assert.match(en, /^For the customer:\nWhat changed: </);
  assert.match(en, /Why it matters: </);

  const tr = execFileSync("node", [cli, "template", "--lang", "tr"], { encoding: "utf8" });
  assert.match(tr, /^Müşteri için:\nNe değişti: </);

  const ja = execFileSync("node", [cli, "template", "--lang", "ja"], { encoding: "utf8" });
  assert.match(ja, /^お客さまへ:\n変わったこと: </);

  const zh = execFileSync("node", [cli, "template", "--lang", "zh"], { encoding: "utf8" });
  assert.match(zh, /^给客户:\n改动内容: </);

  const dir = mkdtempSync(join(tmpdir(), "product-engineer-tmpl-"));
  try {
    writeFileSync(
      join(dir, ".product-engineer.json"),
      JSON.stringify({ headings: { block: "Pour le client:", what: "Ce qui a changé:", why: "Pourquoi c'est important:", automation: "Effet d'automatisation:" } }),
    );
    const fr = execFileSync("node", [cli, "template"], { cwd: dir, encoding: "utf8" });
    assert.match(fr, /^Pour le client:\nCe qui a changé: </);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unfilled template fails check, and passes once filled in", () => {
  const en = execFileSync("node", [cli, "template"], { encoding: "utf8" });
  const messageUnfilled = `feat: add something\n\n${en}\n`;
  const resUnfilled = analyse(messageUnfilled);
  assert.equal(exitCode(resUnfilled), 1, "unfilled template must fail check");

  const messageFilled = `feat: add something\n\nFor the customer:\nWhat changed: Users can export their monthly data to CSV.\nWhy it matters: They requested this to automate reporting.\n`;
  const resFilled = analyse(messageFilled);
  assert.equal(exitCode(resFilled), 0, "filled template must pass check");
});

