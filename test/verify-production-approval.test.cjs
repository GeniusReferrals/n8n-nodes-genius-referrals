'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
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

function git(cwd, args, options = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', ...options });
}

function commitAll(cwd, message) {
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-m', message]);
  return git(cwd, ['rev-parse', 'HEAD']).trim();
}

function createReleaseRepository() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'stable-release-provenance-'));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.name', 'Release Test']);
  git(cwd, ['config', 'user.email', 'release-test@example.invalid']);
  fs.mkdirSync(path.join(cwd, '.github', 'workflows'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.github', 'workflows', 'publish-n8n-node.yml'), 'name: publish\n');
  fs.writeFileSync(path.join(cwd, 'scripts', 'release.cjs'), 'module.exports = true;\n');
  const initial = commitAll(cwd, 'release automation');
  return { cwd, initial };
}

function repositoryExecutor(cwd) {
  return (command, args, options = {}) => execFileSync(command, args, { cwd, ...options });
}

test('production approval verifier resolves content-neutral merge to stable non-merge provenance', (t) => {
  const { cwd, initial } = createReleaseRepository();
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  git(cwd, ['switch', '-c', 'feature']);
  fs.writeFileSync(path.join(cwd, 'README.md'), 'feature\n');
  commitAll(cwd, 'feature docs');
  git(cwd, ['switch', 'main']);
  fs.writeFileSync(path.join(cwd, 'CHANGELOG.md'), 'main\n');
  commitAll(cwd, 'main docs');
  git(cwd, ['merge', '--no-ff', 'feature', '-m', 'content-neutral merge']);

  const resolved = stableReleaseAutomationCommit('f'.repeat(40), repositoryExecutor(cwd));

  assert.equal(resolved, initial);
});

test('production approval verifier keeps supplied SHA for divergent two-parent release merge', (t) => {
  const { cwd } = createReleaseRepository();
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  git(cwd, ['switch', '-c', 'workflow-change']);
  fs.writeFileSync(path.join(cwd, '.github', 'workflows', 'publish-n8n-node.yml'), 'name: publish-v2\n');
  commitAll(cwd, 'change workflow');
  git(cwd, ['switch', 'main']);
  fs.writeFileSync(path.join(cwd, 'scripts', 'release.cjs'), 'module.exports = "v2";\n');
  commitAll(cwd, 'change release script');
  git(cwd, ['merge', '--no-ff', 'workflow-change', '-m', 'divergent release merge']);
  const supplied = git(cwd, ['rev-parse', 'HEAD']).trim();

  const resolved = stableReleaseAutomationCommit(supplied, repositoryExecutor(cwd));

  assert.equal(resolved, supplied);
});

test('production approval verifier retains supplied SHA when Git metadata is unavailable', () => {
  const supplied = 'f'.repeat(40);
  const resolved = stableReleaseAutomationCommit(supplied, () => {
    const error = new Error('git unavailable');
    error.status = 128;
    throw error;
  });

  assert.equal(resolved, supplied);
});
