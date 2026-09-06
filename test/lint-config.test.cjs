'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('lint override follows the top-level n8n node source layout', () => {
  const eslintConfig = readFileSync('eslint.config.mjs', 'utf8');

  assert.match(eslintConfig, /files:\s*\[\s*'nodes\/\*\*\/\*\.node\.ts'\s*\]/);
  assert.equal(eslintConfig.includes("'src/nodes/**/*.node.ts'"), false);
});

test('execute never suppresses or directly throws a raw API error', () => {
  const nodeSource = readFileSync(
    'nodes/GeniusReferrals/GeniusReferrals.node.ts',
    'utf8',
  );
  const errorSource = readFileSync(
    'lib/errors/GeniusReferralsApiError.ts',
    'utf8',
  );

  assert.doesNotMatch(nodeSource, /require-node-api-error/);
  assert.doesNotMatch(nodeSource, /throw\s+error\s*;/);
  assert.doesNotMatch(errorSource, /require-node-api-error/);
  assert.match(nodeSource, /throw toGeniusReferralsNodeApiError\(node, error, \{ itemIndex \}\);/);
  assert.match(errorSource, /return new NodeApiError\(node, errorResponse, nodeApiErrorOptions\)/);
});
