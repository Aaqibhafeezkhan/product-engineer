# Third-party notices

product-engineer is MIT licensed (see `LICENSE`). The files below adapt the shape of files from
other projects. Each section names what was adapted, from which commit, and carries the licence
text the source's licence asks to keep.

## obra/superpowers (MIT)

Adapted: the field layout of `.codex-plugin/plugin.json` (including its `interface` block) and
`.cursor-plugin/plugin.json`, from https://github.com/obra/superpowers at commit
`bb92a77741419a4ab5f06e711a283343f1ada0c3`. Every value was rewritten for product-engineer;
only the key names and nesting follow the source. There is no hooks file, so the Cursor
manifest omits `hooks`.

MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## anthropics/claude-plugins-official (Apache-2.0)

Adapted: the `author` object shape (`name`, plus a url) used by the plugin manifests, as it
appears in https://github.com/anthropics/claude-plugins-official at commit
`a0b04d9ddccaabe1976645f68b0eda50f74e7022`. No text, code or description from that repository
is copied; only field names. Licence: Apache License 2.0,
https://www.apache.org/licenses/LICENSE-2.0 . Changes made: none to the source (this
repository holds no copy of it); the field names are used in new files.
