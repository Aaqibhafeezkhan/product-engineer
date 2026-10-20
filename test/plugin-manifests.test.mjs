// The Codex and Cursor plugin manifests: shape, version, the skills they point at, and the licence
// notice that goes with them. No schema for either app is published, so the shape checked here is the
// one a manifest that those apps load today has (obra/superpowers at bb92a77, MIT): the key names are
// an allowlist, so a typo such as "skill" for "skills" fails here instead of in somebody's app.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { versionedFiles, readVersion } from "../scripts/versioned-files.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const version = JSON.parse(read("package.json")).version;

const KEYS = {
  codex: {
    file: ".codex-plugin/plugin.json",
    top: ["name", "version", "description", "author", "homepage", "repository", "license", "keywords", "skills", "hooks", "interface"],
    required: ["name", "version", "description", "skills", "interface"],
    interface: ["displayName", "shortDescription", "longDescription", "developerName", "category", "capabilities", "defaultPrompt", "websiteURL", "privacyPolicyURL", "termsOfServiceURL", "brandColor", "composerIcon", "logo", "screenshots"],
  },
  cursor: {
    file: ".cursor-plugin/plugin.json",
    top: ["name", "displayName", "description", "version", "author", "homepage", "repository", "license", "keywords", "skills", "hooks"],
    required: ["name", "displayName", "description", "version", "skills"],
  },
};

/** What an app does with the `skills` field: a directory whose children each hold a SKILL.md. */
function loadSkills(skillsField) {
  const dir = join(root, skillsField);
  assert.ok(existsSync(dir) && statSync(dir).isDirectory(), `${skillsField} is not a directory`);
  const loaded = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const file = join(dir, entry.name, "SKILL.md");
    assert.ok(existsSync(file), `${skillsField}${entry.name} has no SKILL.md`);
    const front = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, "utf8"))?.[1] ?? "";
    const name = /^name: (.+)$/m.exec(front)?.[1];
    const description = /^description: (.+)$/m.exec(front)?.[1];
    assert.equal(name, entry.name, `${entry.name}: frontmatter name must equal the directory`);
    assert.ok(description, `${entry.name}: no description`);
    loaded.push(name);
  }
  return loaded;
}

for (const [app, spec] of Object.entries(KEYS)) {
  const manifest = () => JSON.parse(read(spec.file));

  test(`${app}: the manifest is valid JSON with only known keys, and the required ones`, () => {
    const m = manifest();
    for (const k of Object.keys(m)) assert.ok(spec.top.includes(k), `${spec.file}: unknown key ${k}`);
    for (const k of spec.required) assert.ok(k in m, `${spec.file}: missing ${k}`);
    assert.equal(m.name, "product-engineer");
    assert.equal(typeof m.description, "string");
    assert.ok(m.description.length > 0);
  });

  test(`${app}: the version is the package version`, () => {
    assert.equal(manifest().version, version);
  });

  test(`${app}: skills points at a directory that loads all four skills`, () => {
    const m = manifest();
    assert.match(m.skills, /^\.\/.+\/$/);
    assert.deepEqual(loadSkills(m.skills.slice(2)).sort(), ["customer-block", "done-means-observed", "product-engineer", "release-notes"]);
  });
}

test("codex: the interface block has only known keys, the text fields, and path fields that exist", () => {
  const i = JSON.parse(read(KEYS.codex.file)).interface;
  for (const k of Object.keys(i)) assert.ok(KEYS.codex.interface.includes(k), `unknown interface key ${k}`);
  for (const k of ["displayName", "shortDescription", "longDescription", "developerName", "category", "websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    assert.equal(typeof i[k], "string", k);
    assert.ok(i[k].length > 0, k);
  }
  assert.ok(Array.isArray(i.capabilities) && i.capabilities.every((c) => typeof c === "string"));
  assert.ok(Array.isArray(i.defaultPrompt) && i.defaultPrompt.every((c) => typeof c === "string"));
  for (const k of ["composerIcon", "logo"]) if (k in i) assert.ok(existsSync(join(root, ".codex-plugin", i[k])) || existsSync(join(root, i[k])), `${k} points at a missing file`);
});

test("the release script's patterns read the version out of both manifests, so a release cannot leave one behind", () => {
  const entries = versionedFiles(root);
  for (const spec of Object.values(KEYS)) {
    const entry = entries.find((e) => e.path === spec.file);
    assert.ok(entry, `${spec.file} is not in scripts/versioned-files.json`);
    assert.equal(readVersion(read(spec.file), entry), version);
  }
});

test("the licence notice keeps the copyright line and permission text of what was adapted", () => {
  const n = read("THIRD_PARTY_NOTICES.md");
  assert.match(n, /Copyright \(c\) 2025 Jesse Vincent/);
  assert.match(n, /Permission is hereby granted, free of charge/);
  assert.match(n, /bb92a77741419a4ab5f06e711a283343f1ada0c3/);
  assert.match(n, /Apache License 2\.0/);
});
