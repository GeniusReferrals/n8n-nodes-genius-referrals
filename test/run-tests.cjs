'use strict';

// Portable test runner for `npm test`.
//
// Why this exists: the previous script used `node --test test/**/*.test.cjs`,
// which depends on shell glob expansion. Minimal POSIX shells (Alpine busybox
// ash, Debian dash) do not expand `**`, and Node 18 does not expand globs
// itself, so the pattern reached Node as a literal path and failed. Passing a
// bare directory (`node --test test/`) is not portable either: Node 18 scans
// the directory, while newer Node versions try to execute it as a file.
// Enumerating files here and passing explicit paths behaves identically
// across shells and supported Node versions.

const { readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');
const { spawnSync } = require('node:child_process');

const TEST_FILE_PATTERN = /\.test\.cjs$/;

function collectTestFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) {
      continue;
    }

    const fullPath = join(dir, entry);

    if (statSync(fullPath).isDirectory()) {
      collectTestFiles(fullPath, files);
    } else if (TEST_FILE_PATTERN.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

const testFiles = collectTestFiles(__dirname).sort();

if (testFiles.length === 0) {
  console.error(`No test files found under ${__dirname}`);
  process.exit(1);
}

console.log(`Running ${testFiles.length} test file(s) sequentially:`);
for (const file of testFiles) {
  console.log(`- ${relative(process.cwd(), file)}`);
}

const failedFiles = [];

for (const file of testFiles) {
  const relativeFile = relative(process.cwd(), file);

  console.log(`\n> ${relativeFile}`);

  const result = spawnSync(process.execPath, ['--test', file], {
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
    failedFiles.push(relativeFile);
    continue;
  }

  if (result.status !== 0) {
    failedFiles.push(relativeFile);
  }
}

if (failedFiles.length > 0) {
  console.error(`Failed test file(s): ${failedFiles.join(', ')}`);
  process.exit(1);
}

process.exit(0);
