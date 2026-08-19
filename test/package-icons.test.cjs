'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { dirname, join, normalize } = require('node:path');

const EXPECTED_NODE_ICON = {
  light: 'file:../../icons/genius-referrals.svg',
  dark: 'file:../../icons/genius-referrals-dark.png',
};

const EXPECTED_CREDENTIAL_ICON = {
  light: 'file:../icons/genius-referrals.svg',
  dark: 'file:../icons/genius-referrals-dark.png',
};

const EXPECTED_NODE_IDENTITY = {
  name: 'geniusReferrals',
  displayName: 'Genius Referrals',
};

const REQUIRED_PACKAGE_FILES = [
  'dist/credentials/GeniusReferralsApi.credentials.d.ts',
  'dist/credentials/GeniusReferralsApi.credentials.js',
  'dist/icons/genius-referrals-dark.png',
  'dist/icons/genius-referrals.svg',
  'dist/index.d.ts',
  'dist/index.js',
  'dist/nodes/GeniusReferrals/GeniusReferrals.node.d.ts',
  'dist/nodes/GeniusReferrals/GeniusReferrals.node.js',
];

function packageFilesFromDryRun() {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
  });
  const packages = JSON.parse(output);

  assert.equal(packages.length, 1);

  return new Set(packages[0].files.map((file) => file.path));
}

function iconPathFromDescriptor(compiledFilePath, iconPath) {
  assert.equal(iconPath.startsWith('file:'), true);

  return normalize(join(dirname(compiledFilePath), iconPath.slice('file:'.length)));
}

test('node and credential metadata use the Genius Referrals icon assets', () => {
  const { GeniusReferrals } = require('../dist/nodes/GeniusReferrals/GeniusReferrals.node.js');
  const { GeniusReferralsApi } = require('../dist/credentials/GeniusReferralsApi.credentials.js');
  const description = new GeniusReferrals().description;

  assert.equal(description.name, EXPECTED_NODE_IDENTITY.name);
  assert.equal(description.displayName, EXPECTED_NODE_IDENTITY.displayName);
  assert.deepEqual(description.group, ['transform']);
  assert.equal(typeof description.description, 'string');
  assert.equal(description.description.length > 0, true);
  assert.equal(description.usableAsTool, true);
  assert.deepEqual(description.icon, EXPECTED_NODE_ICON);
  assert.deepEqual(new GeniusReferralsApi().icon, EXPECTED_CREDENTIAL_ICON);
});

test('compiled node and credential icon paths resolve to packaged dist icons', () => {
  const nodeFile = join(__dirname, '..', 'dist', 'nodes', 'GeniusReferrals', 'GeniusReferrals.node.js');
  const credentialFile = join(__dirname, '..', 'dist', 'credentials', 'GeniusReferralsApi.credentials.js');

  for (const iconPath of Object.values(EXPECTED_NODE_ICON)) {
    assert.equal(existsSync(iconPathFromDescriptor(nodeFile, iconPath)), true);
  }

  for (const iconPath of Object.values(EXPECTED_CREDENTIAL_ICON)) {
    assert.equal(existsSync(iconPathFromDescriptor(credentialFile, iconPath)), true);
  }
});

test('npm package includes compiled node, credential, declarations, and referenced icons', () => {
  const packageFiles = packageFilesFromDryRun();

  for (const requiredFile of REQUIRED_PACKAGE_FILES) {
    assert.equal(packageFiles.has(requiredFile), true, `${requiredFile} is packaged`);
  }

  assert.equal(packageFiles.has('icons/genius-referrals.svg'), true);
  assert.equal(packageFiles.has('icons/genius-referrals-dark.png'), true);
  assert.equal(packageFiles.has('dist/icons/genius-referrals.svg'), true);
  assert.equal(packageFiles.has('dist/icons/genius-referrals-dark.png'), true);
  assert.equal(packageFiles.has('icons/genius-referrals-dark.svg'), false);
  assert.equal(packageFiles.has('dist/icons/genius-referrals-dark.svg'), false);
});
