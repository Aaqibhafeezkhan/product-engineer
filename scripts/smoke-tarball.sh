#!/bin/sh
# Packs the package exactly as npm would publish it, installs the tarball in an empty
# project, imports it when it has a library entry, and runs the bin. Catches a missing
# `files` entry or a broken `bin` path before a version is on the registry.
set -eu
root=$(pwd)
name=$(node -p "require('./package.json').name")
bin=$(node -p "Object.keys(require('./package.json').bin || {})[0] || ''")
entry=$(node -p "const p = require('./package.json'); p.exports || p.main ? 'yes' : ''")
tgz=$(npm pack --silent 2>/dev/null | tail -1)
dir=$(mktemp -d)
cd "$dir"
# `npm ci` from a lockfile written here, rather than `npm install <tarball>`, so every install in
# this repository comes from a lockfile. The lockfile records the sha512 of the tarball just
# packed and npm ci checks it: a lockfile carrying a different hash fails with EINTEGRITY.
node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [tgz, pkgPath] = process.argv.slice(1);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const integrity = 'sha512-' + createHash('sha512').update(readFileSync(tgz)).digest('base64');
const spec = 'file:' + tgz;
const entry = { version: pkg.version, resolved: spec, integrity };
for (const k of ['license', 'bin', 'engines']) if (pkg[k]) entry[k] = pkg[k];
writeFileSync('package.json', JSON.stringify({ name: 'smoke', version: '0.0.0', private: true, dependencies: { [pkg.name]: spec } }, null, 2) + '\\n');
writeFileSync('package-lock.json', JSON.stringify({
  name: 'smoke', version: '0.0.0', lockfileVersion: 3, requires: true,
  packages: { '': { name: 'smoke', version: '0.0.0', dependencies: { [pkg.name]: spec } }, ['node_modules/' + pkg.name]: entry },
}, null, 2) + '\\n');
" "$root/$tgz" "$root/package.json"
npm ci --silent --ignore-scripts
if [ -n "$entry" ]; then
  node --input-type=module -e "import('$name').then(m => { const k = Object.keys(m); if (!k.length) throw new Error('no exports'); console.log('exports:', k.join(', ')); })"
else
  echo "no main or exports: command-line package, import step skipped"
fi
if [ -n "$bin" ]; then npx --no "$bin" --help >/dev/null && echo "bin ok: $bin --help"; fi
cd "$root" && rm -rf "$dir" "$tgz"
