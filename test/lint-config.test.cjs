'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('lint override follows the top-level n8n node source layout', () => {
  const eslintConfig = readFileSync('eslint.config.mjs', 'utf8');

  assert.match(eslintConfig, /files:\s*\[\s*'nodes\/\*\*\/\*\.node\.ts'\s*\]/);
  assert.equal(eslintConfig.includes("'src/nodes/**/*.node.ts'"), false);
});
