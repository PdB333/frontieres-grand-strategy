#!/usr/bin/env node
// Assembles the standalone index.html from src/shell.html, src/ and data/.
//   node tools/build.mjs          rebuild index.html
//   node tools/build.mjs --check  fail if index.html is not up to date
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const INCLUDE = /<!-- @include ([\w./-]+) -->/g;

export function build() {
  return read('src/shell.html').replace(INCLUDE, (_, path) => {
    const text = read(path);
    // The file is inlined inside <style> or <script>: a closing tag would end it early.
    if (/<\/(script|style)/i.test(text)) throw new Error(`${path} contains a closing </script> or </style> tag`);
    if (path.endsWith('.json')) {
      try { JSON.parse(text); } catch (error) { throw new Error(`${path} is not valid JSON: ${error.message}`); }
    }
    return text;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const html = build();
  if (process.argv.includes('--check')) {
    if (read('index.html') !== html) {
      console.error('index.html is out of date: run `node tools/build.mjs` and commit the result.');
      process.exit(1);
    }
    console.log('index.html is up to date.');
  } else {
    writeFileSync(join(root, 'index.html'), html);
    console.log(`index.html written (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MiB).`);
  }
}
