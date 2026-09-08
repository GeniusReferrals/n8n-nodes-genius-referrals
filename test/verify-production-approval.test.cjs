'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  listIssueComments,
  stableReleaseAutomationCommit,
} = require('../scripts/verify-production-approval.cjs');

test('production approval verifier paginates past the first 100 issue comments', async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }));
  const secondPage = [{ id: 101, body: '[ProductionApprovalRequest]' }, { id: 102, body: '[ProductionApproval]' }];
  const paths = [];
  const requestJson = async (path) => {
    paths.push(path);
    return path.endsWith('page=1') ? firstPage : secondPage;
  };

  const comments = await listIssueComments('GeniusReferrals/n8n-nodes-genius-referrals', 17, 'test-token', requestJson);

  assert.equal(comments.length, 102);
  assert.equal(comments.at(-1).id, 102);
  assert.deepEqual(paths, [
    '/repos/GeniusReferrals/n8n-nodes-genius-referrals/issues/17/comments?per_page=100&page=1',
    '/repos/GeniusReferrals/n8n-nodes-genius-referrals/issues/17/comments?per_page=100&page=2',
  ]);
});

test('production approval verifier resolves non-merge release automation provenance', () => {
  const resolved = stableReleaseAutomationCommit('f'.repeat(40), (command, args) => {
    assert.equal(command, 'git');
    assert.deepEqual(args, [
      'log', '--no-merges', '-n', '1', '--format=%H', '--',
      '.github/workflows/publish-n8n-node.yml', 'scripts',
    ]);
    return 'a'.repeat(40) + '\n';
  });

  assert.equal(resolved, 'a'.repeat(40));
});
