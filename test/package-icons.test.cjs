'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

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

function packageFilesFromDryRun() {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
  });
  const packages = JSON.parse(output);

  assert.equal(packages.length, 1);

  return new Set(packages[0].files.map((file) => file.path));
}

test('node and credential metadata use the Genius Referrals icon assets', () => {
  const { GeniusReferrals } = require('../dist/nodes/GeniusReferrals/GeniusReferrals.node.js');
  const { GeniusReferralsApi } = require('../dist/credentials/GeniusReferralsApi.credentials.js');

  assert.equal(new GeniusReferrals().description.name, EXPECTED_NODE_IDENTITY.name);
  assert.equal(new GeniusReferrals().description.displayName, EXPECTED_NODE_IDENTITY.displayName);
  assert.deepEqual(new GeniusReferrals().description.icon, EXPECTED_NODE_ICON);
  assert.deepEqual(new GeniusReferralsApi().icon, EXPECTED_CREDENTIAL_ICON);
});

test('npm package includes required Genius Referrals icons and excludes removed dark SVG', () => {
  const packageFiles = packageFilesFromDryRun();

  assert.equal(packageFiles.has('icons/genius-referrals.svg'), true);
  assert.equal(packageFiles.has('icons/genius-referrals-dark.png'), true);
  assert.equal(packageFiles.has('icons/genius-referrals-dark.svg'), false);
});
