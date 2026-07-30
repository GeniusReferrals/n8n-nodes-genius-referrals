const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
  assertNoNpmTokenEnv,
  assertPublishTokenForMode,
  assertSupportedToolchain,
  classifyRegistryVersion,
  readReleaseManifest,
  sha256File,
  verifyApprovalComment,
  verifyPreparedArtifact,
} = require('../scripts/release-controls.cjs');

const manifest = readReleaseManifest('release-manifest.json');

function approvalComment(overrides = {}) {
  return {
    id: 123456,
    issue_url: `https://api.github.com/repos/${manifest.approval.repository}/issues/${manifest.approval.issueNumber}`,
    user: {
      login: 'alainhl',
    },
    body: [
      '[ProductionApproval]',
      'Decision=APPROVED',
      `Package=${manifest.package.name}`,
      `Version=${manifest.package.version}`,
      `Commit=${manifest.source.commit}`,
      `PackageSHA256=${manifest.artifact.sha256}`,
      'AuthorizedActions=npm publication',
      'PreparedRunID=987654',
      'PreparedArtifactID=24680',
      overrides.extraBody ?? '',
    ].join('\n'),
    ...overrides,
  };
}

test('reusable workflow does not hard-code per-release identity', () => {
  const workflow = require('node:fs').readFileSync('.github/workflows/publish-n8n-node.yml', 'utf8');

  assert.equal(workflow.includes(manifest.source.commit), false);
  assert.equal(workflow.includes(manifest.artifact.sha256), false);
  assert.equal(workflow.includes('5132426865'), false);
  assert.equal(workflow.includes('5132427933'), false);
});

test('workflow maps dispatch inputs before shell use', () => {
  const workflow = require('node:fs').readFileSync('.github/workflows/publish-n8n-node.yml', 'utf8');
  const lines = workflow.split(/\r?\n/);
  let inRunBlock = false;

  for (const line of lines) {
    if (/^\s+run: \|$/.test(line)) {
      inRunBlock = true;
      continue;
    }

    if (inRunBlock && /^\s{6}- name: /.test(line)) {
      inRunBlock = false;
    }

    if (inRunBlock) {
      assert.equal(line.includes('${{ inputs.'), false, `untrusted input interpolation in run block: ${line}`);
    }
  }
});

test('approval gate requires actual alainhl GitHub author and structured fields', () => {
  const summary = verifyApprovalComment({
    approvalComment: approvalComment(),
    manifest,
    expectedCommentId: '123456',
    preparedRunId: '987654',
    preparedArtifactId: '24680',
    issueComments: [],
  });

  assert.equal(summary.approvalAuthor, 'alainhl');
  assert.equal(summary.fields.Decision, 'APPROVED');
});

test('approval gate rejects bot comment that only claims ApprovedBy=alainhl', () => {
  assert.throws(
    () =>
      verifyApprovalComment({
        approvalComment: approvalComment({
          user: {
            login: 'aegis-bot',
          },
          extraBody: 'ApprovedBy=alainhl',
        }),
        manifest,
        expectedCommentId: '123456',
        preparedRunId: '987654',
        preparedArtifactId: '24680',
        issueComments: [],
      }),
    /author is aegis-bot; expected alainhl/,
  );
});

test('approval gate rejects prepared artifact reuse for a different release', () => {
  assert.throws(
    () =>
      verifyApprovalComment({
        approvalComment: approvalComment(),
        manifest,
        expectedCommentId: '123456',
        preparedRunId: '987654',
        preparedArtifactId: '24680',
        issueComments: [
          {
            body: [
              '[PublicationEvidence]',
              'Package=other-package',
              `Version=${manifest.package.version}`,
              `Commit=${manifest.source.commit}`,
              `PackageSHA256=${manifest.artifact.sha256}`,
              'PreparedRunID=987654',
              'PreparedArtifactID=24680',
            ].join('\n'),
          },
        ],
      }),
    /already consumed for a different release/,
  );
});

test('unsupported npm versions fail closed', () => {
  assert.throws(() => assertSupportedToolchain('v24.16.0', '11.4.9'), /Unsupported npm version/);
  assert.throws(() => assertSupportedToolchain('v22.23.2', '11.5.1'), /Unsupported Node.js version/);
});

test('release preparation enforces real n8n lint and refuses npm tokens', () => {
  const packageJson = require('../package.json');
  const verifier = require('node:fs').readFileSync('scripts/verify-approved-release.cjs', 'utf8');

  assert.equal(packageJson.scripts.lint, 'n8n-node lint');
  assert.equal(verifier.includes("summary.commands.push('npm run lint: PASS')"), true);
  assert.throws(() => assertNoNpmTokenEnv({ NPM_TOKEN: 'secret' }), /must not be present/);
  assert.doesNotThrow(() => assertNoNpmTokenEnv({}));
});

test('prepared artifact verification reuses exact tarball and rejects changed checksum', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-controls-test-'));

  try {
    const tarball = join(dir, 'package.tgz');
    writeFileSync(tarball, 'prepared artifact');

    const testManifest = {
      ...manifest,
      artifact: {
        ...manifest.artifact,
        sha256: sha256File(tarball),
        sha512: null,
      },
    };

    assert.doesNotThrow(() =>
      verifyPreparedArtifact({
        manifest: testManifest,
        artifactDir: dir,
      }),
    );

    writeFileSync(tarball, 'changed artifact');
    assert.throws(
      () =>
        verifyPreparedArtifact({
          manifest: testManifest,
          artifactDir: dir,
        }),
      /Prepared tarball SHA-256 mismatch/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('registry status supports idempotent duplicate publication handling', () => {
  assert.equal(classifyRegistryVersion(null, manifest, true), 'missing');
  assert.equal(
    classifyRegistryVersion(
      {
        versions: {
          [manifest.package.version]: {
            name: manifest.package.name,
            version: manifest.package.version,
          },
        },
      },
      manifest,
      false,
    ),
    'published',
  );
});

test('npm secret is required only for real publish mode', () => {
  assert.doesNotThrow(() => assertPublishTokenForMode('dry-run', {}, 'NPM_TOKEN'));
  assert.throws(() => assertPublishTokenForMode('real', {}, 'NPM_TOKEN'), /required for real publish mode/);
  assert.doesNotThrow(() => assertPublishTokenForMode('real', { NPM_TOKEN: 'secret' }, 'NPM_TOKEN'));
});
