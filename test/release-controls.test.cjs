const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
  assertNoNpmTokenEnv,
  assertPublishTokenForMode,
  assertSupportedToolchain,
  buildApprovalPacketFreshnessReport,
  buildPublicationEvidence,
  classifyRegistryVersion,
  readReleaseManifest,
  sha256File,
  verifyApprovalComment,
  verifyPreparedArtifact,
} = require('../scripts/release-controls.cjs');
const {
  scanOutputPassed,
} = require('../scripts/verify-community-scan.cjs');
const {
  checkoutReleaseSource,
  commitExists,
  ensureGitCommitAvailable,
  isAlreadyPublishedDryRunError,
  parseNpmViewDist,
} = require('../scripts/verify-approved-release.cjs');

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
      `FinalReleaseCommit=${manifest.release.finalWorkflowCommit}`,
      `PackageSHA256=${manifest.artifact.sha256}`,
      `AuthorizedActions=${manifest.approval.requiredAuthorizedAction}`,
      'PreparedRunID=987654',
      'PreparedArtifactID=24680',
      overrides.extraBody ?? '',
    ].join('\n'),
    ...overrides,
  };
}

function approvalPacketComment({ id = 654321, createdAt = '2026-09-01T12:00:00Z', releaseManifest = manifest } = {}) {
  return {
    id,
    html_url: `https://github.com/${releaseManifest.approval.repository}/issues/${releaseManifest.approval.issueNumber}#issuecomment-${id}`,
    created_at: createdAt,
    body: [
      '[ProductionApprovalRequest] Agent=Aegis | SourceIssue=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200 | PullRequest=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/pull/201',
      '',
      '```text',
      '[ProductionApproval]',
      'Decision=APPROVED',
      `Package=${releaseManifest.package.name}`,
      `Version=${releaseManifest.package.version}`,
      `Commit=${releaseManifest.source.commit}`,
      `FinalReleaseCommit=${releaseManifest.release.finalWorkflowCommit}`,
      `PackageSHA256=${releaseManifest.artifact.sha256}`,
      `AuthorizedActions=${releaseManifest.approval.requiredAuthorizedAction}`,
      'PreparedRunID=987654',
      'PreparedArtifactID=24680',
      '```',
    ].join('\n'),
  };
}

function futureManifest(overrides = {}) {
  return {
    ...manifest,
    package: {
      ...manifest.package,
      version: overrides.version ?? '9.9.9',
    },
    source: {
      commit: overrides.sourceCommit ?? '1111111111111111111111111111111111111111',
    },
    release: {
      finalWorkflowCommit: overrides.finalWorkflowCommit ?? '2222222222222222222222222222222222222222',
    },
    artifact: {
      sha256: overrides.sha256 ?? '3'.repeat(64),
      sha512: manifest.artifact.sha512,
    },
  };
}

function gitOutput(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    ...options,
  }).trim();
}

function assertReleaseWorkflowCommitIsFresh({
  cwd = process.cwd(),
  expectedCommit = manifest.release.finalWorkflowCommit,
} = {}) {
  const releasePaths = ['.github/workflows/publish-n8n-node.yml', 'scripts'];
  const releaseWorkflowCommit = gitOutput([
    'log',
    '-n',
    '1',
    '--format=%H',
    '--',
    ...releasePaths,
  ], { cwd });

  if (releaseWorkflowCommit === expectedCommit) {
    return;
  }

  const isShallow = gitOutput(['rev-parse', '--is-shallow-repository'], { cwd }) === 'true';

  if (!isShallow) {
    assert.equal(expectedCommit, releaseWorkflowCommit);
    return;
  }

  ensureGitCommitAvailable(cwd, expectedCommit);

  try {
    execFileSync(
      'git',
      ['diff', '--quiet', `${expectedCommit}..HEAD`, '--', ...releasePaths],
      { cwd, stdio: 'ignore' },
    );
  } catch (error) {
    if (error.status === 1) {
      assert.equal(expectedCommit, releaseWorkflowCommit);
      return;
    }

    throw error;
  }
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

test('workflow scopes issue write permission to publish job', () => {
  const workflow = require('node:fs').readFileSync('.github/workflows/publish-n8n-node.yml', 'utf8');

  assert.match(workflow, /^permissions:\n(?:  .+\n)*  issues: read$/m);
  assert.match(workflow, /publish-release:[\s\S]*?permissions:\n(?: {6}.+\n)* {6}issues: write/);

  const prepareJob = workflow.slice(workflow.indexOf('prepare-release:'), workflow.indexOf('publish-release:'));
  assert.equal(prepareJob.includes('issues: write'), false);
});

test('release manifest final workflow commit matches current release automation', () => {
  assertReleaseWorkflowCommitIsFresh();
});

test('release workflow freshness tolerates shallow manifest-only heads', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-shallow-workflow-'));
  const sourceDir = join(dir, 'source');
  const remoteDir = join(dir, 'remote.git');
  const shallowDir = join(dir, 'shallow');

  try {
    execFileSync('git', ['init', sourceDir], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: sourceDir });
    execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: sourceDir });
    mkdirSync(join(sourceDir, '.github', 'workflows'), { recursive: true });
    mkdirSync(join(sourceDir, 'scripts'), { recursive: true });
    writeFileSync(join(sourceDir, '.github', 'workflows', 'publish-n8n-node.yml'), 'name: publish\n');
    writeFileSync(join(sourceDir, 'scripts', 'verify-approved-release.cjs'), "'use strict';\n");
    execFileSync('git', ['add', '.'], { cwd: sourceDir });
    execFileSync('git', ['commit', '-m', 'release automation'], { cwd: sourceDir, stdio: 'ignore' });
    const workflowCommit = gitOutput(['rev-parse', 'HEAD'], { cwd: sourceDir });

    writeFileSync(join(sourceDir, 'release-manifest.json'), '{"schemaVersion":1}\n');
    execFileSync('git', ['add', 'release-manifest.json'], { cwd: sourceDir });
    execFileSync('git', ['commit', '-m', 'release manifest only'], { cwd: sourceDir, stdio: 'ignore' });

    execFileSync('git', ['clone', '--bare', sourceDir, remoteDir], { stdio: 'ignore' });
    execFileSync('git', ['clone', '--depth', '1', `file://${remoteDir}`, shallowDir], { stdio: 'ignore' });

    assert.equal(gitOutput(['rev-parse', '--is-shallow-repository'], { cwd: shallowDir }), 'true');
    assert.doesNotThrow(() =>
      assertReleaseWorkflowCommitIsFresh({
        cwd: shallowDir,
        expectedCommit: workflowCommit,
      }),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release source checkout recovers commit tree after shallow local clone', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-source-tree-'));
  const sourceDir = join(dir, 'source');
  const remoteDir = join(dir, 'remote.git');
  const shallowDir = join(dir, 'shallow');
  const preparedSourceDir = join(dir, 'prepared-source');

  try {
    execFileSync('git', ['init', sourceDir], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: sourceDir });
    execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: sourceDir });
    writeFileSync(join(sourceDir, 'package.json'), '{"name":"test-package","version":"1.0.0"}\n');
    execFileSync('git', ['add', 'package.json'], { cwd: sourceDir });
    execFileSync('git', ['commit', '-m', 'package source'], { cwd: sourceDir, stdio: 'ignore' });
    const packageCommit = gitOutput(['rev-parse', 'HEAD'], { cwd: sourceDir });

    writeFileSync(join(sourceDir, 'release-manifest.json'), '{"schemaVersion":1}\n');
    execFileSync('git', ['add', 'release-manifest.json'], { cwd: sourceDir });
    execFileSync('git', ['commit', '-m', 'manifest only'], { cwd: sourceDir, stdio: 'ignore' });

    execFileSync('git', ['clone', '--bare', sourceDir, remoteDir], { stdio: 'ignore' });
    execFileSync('git', ['clone', '--depth', '1', `file://${remoteDir}`, shallowDir], { stdio: 'ignore' });
    execFileSync('git', ['fetch', '--no-tags', 'origin', packageCommit], {
      cwd: shallowDir,
      stdio: 'ignore',
    });

    const tree = gitOutput(['rev-parse', `${packageCommit}^{tree}`], { cwd: shallowDir });
    const treePath = join(shallowDir, '.git', 'objects', tree.slice(0, 2), tree.slice(2));
    rmSync(treePath, { force: true });

    assert.equal(commitExists(shallowDir, packageCommit), false);

    const availability = checkoutReleaseSource({
      repoRoot: shallowDir,
      sourceDir: preparedSourceDir,
      sourceCommit: packageCommit,
    });

    assert.equal(availability.rootAvailability.available, true);
    assert.equal(gitOutput(['rev-parse', 'HEAD'], { cwd: preparedSourceDir }), packageCommit);
    assert.equal(commitExists(preparedSourceDir, packageCommit), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
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
    currentWorkflowCommit: manifest.release.finalWorkflowCommit,
  });

  assert.equal(summary.approvalAuthor, 'alainhl');
  assert.equal(summary.fields.Decision, 'APPROVED');
});

test('approval gate rejects missing or mismatched release workflow commit', () => {
  assert.throws(
    () =>
      verifyApprovalComment({
        approvalComment: approvalComment({
          body: approvalComment().body.replace(
            `FinalReleaseCommit=${manifest.release.finalWorkflowCommit}\n`,
            '',
          ),
        }),
        manifest,
        expectedCommentId: '123456',
        preparedRunId: '987654',
        preparedArtifactId: '24680',
        issueComments: [],
        currentWorkflowCommit: manifest.release.finalWorkflowCommit,
      }),
    /Approval FinalReleaseCommit mismatch/,
  );

  assert.throws(
    () =>
      verifyApprovalComment({
        approvalComment: approvalComment(),
        manifest,
        expectedCommentId: '123456',
        preparedRunId: '987654',
        preparedArtifactId: '24680',
        issueComments: [],
        currentWorkflowCommit: '0000000000000000000000000000000000000000',
      }),
    /Release workflow commit mismatch/,
  );
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
              'FinalReleaseCommit=0000000000000000000000000000000000000000',
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

test('approval packet freshness is scoped to the n8n community node repository', () => {
  const otherRepoManifest = {
    ...futureManifest(),
    approval: {
      ...manifest.approval,
      repository: 'GeniusReferrals/other-package',
    },
  };

  const report = buildApprovalPacketFreshnessReport({
    approvalComment: approvalComment({ created_at: '2026-09-01T12:05:00Z' }),
    manifest: otherRepoManifest,
    preparedRunId: '987654',
    preparedArtifactId: '24680',
    approvalIssueComments: [
      {
        ...approvalPacketComment({ releaseManifest: otherRepoManifest }),
        body: approvalPacketComment({ releaseManifest: otherRepoManifest }).body.replaceAll(
          'GeniusReferrals/n8n-nodes-genius-referrals',
          'GeniusReferrals/other-package',
        ),
      },
    ],
    sourceIssueComments: [
      {
        id: 777,
        created_at: '2026-09-01T12:10:00Z',
        body: '[SentinelQaEvidence] Result=PASS | GitHub=https://github.com/GeniusReferrals/other-package/issues/200',
      },
    ],
  });

  assert.equal(report.applied, false);
  assert.equal(report.reason, 'REPOSITORY_FILTER_NOT_MATCHED');
  assert.equal(report.stale, false);
});

test('approval packet freshness dry-run reports future stale release evidence without hard-coded release identity', () => {
  const releaseManifest = futureManifest();
  const packet = approvalPacketComment({ releaseManifest, createdAt: '2026-09-01T12:00:00Z' });
  const approval = approvalComment({
    id: 999999,
    created_at: '2026-09-01T12:01:00Z',
    body: approvalComment().body
      .replace(`Version=${manifest.package.version}`, `Version=${releaseManifest.package.version}`)
      .replace(`Commit=${manifest.source.commit}`, `Commit=${releaseManifest.source.commit}`)
      .replace(`FinalReleaseCommit=${manifest.release.finalWorkflowCommit}`, `FinalReleaseCommit=${releaseManifest.release.finalWorkflowCommit}`)
      .replace(`PackageSHA256=${manifest.artifact.sha256}`, `PackageSHA256=${releaseManifest.artifact.sha256}`),
  });

  const report = buildApprovalPacketFreshnessReport({
    approvalComment: approval,
    manifest: releaseManifest,
    preparedRunId: '987654',
    preparedArtifactId: '24680',
    approvalIssueComments: [packet],
    sourceIssueComments: [
      {
        id: 111,
        html_url: 'https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200#issuecomment-111',
        created_at: '2026-09-01T12:02:00Z',
        body: '[SentinelQaEvidence] Project=gr-agent-led-dev-delivery | GitHub=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200 | PullRequest=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/pull/201 | Result=PASS | TestedSHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
      {
        id: 112,
        html_url: 'https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200#issuecomment-112',
        created_at: '2026-09-01T12:03:00Z',
        body: '[MbpEnvironmentGate] Project=gr-agent-led-dev-delivery | Phase=Stage | Result=PASS | GitHub=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200 | PullRequest=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/pull/201',
      },
      {
        id: 113,
        html_url: 'https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200#issuecomment-113',
        created_at: '2026-09-01T12:04:00Z',
        body: '[RiskDisposition] Agent=Ledger | Result=PASS | GitHub=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200 | PullRequest=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/pull/201',
      },
      {
        id: 114,
        html_url: 'https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200#issuecomment-114',
        created_at: '2026-09-01T12:05:00Z',
        body: '[MergeController] Agent=Aegis | Result=MERGED | GitHub=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200 | PullRequest=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/pull/201',
      },
    ],
    publicationIssueComments: [
      {
        id: 115,
        html_url: 'https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/23#issuecomment-115',
        created_at: '2026-09-01T12:06:00Z',
        body: [
          '[PublicationEvidence]',
          `Package=${releaseManifest.package.name}`,
          `Version=${releaseManifest.package.version}`,
          'RegistryStatus=published',
        ].join('\n'),
      },
    ],
  });

  assert.equal(report.applied, true);
  assert.equal(report.stale, true);
  assert.equal(report.affected.repository, 'GeniusReferrals/n8n-nodes-genius-referrals');
  assert.equal(report.affected.sourceIssueNumber, 200);
  assert.equal(report.affected.pullRequestNumber, 201);
  assert.equal(report.affected.packetCommentId, '654321');
  assert.deepEqual(
    report.staleReasons.map((reason) => reason.reason),
    [
      'QA_EVIDENCE_CHANGED',
      'MBP_STAGE_EVIDENCE_CHANGED',
      'LEDGER_EVIDENCE_CHANGED',
      'MERGE_EVIDENCE_CHANGED',
      'NPM_REGISTRY_READBACK_CHANGED',
    ],
  );
});

test('approval gate rejects stale approval packet after future evidence chain changes', () => {
  const releaseManifest = futureManifest();
  const packet = approvalPacketComment({ releaseManifest, createdAt: '2026-09-01T12:00:00Z' });
  const approval = approvalComment({
    id: 999999,
    created_at: '2026-09-01T12:01:00Z',
    body: approvalComment().body
      .replace(`Version=${manifest.package.version}`, `Version=${releaseManifest.package.version}`)
      .replace(`Commit=${manifest.source.commit}`, `Commit=${releaseManifest.source.commit}`)
      .replace(`FinalReleaseCommit=${manifest.release.finalWorkflowCommit}`, `FinalReleaseCommit=${releaseManifest.release.finalWorkflowCommit}`)
      .replace(`PackageSHA256=${manifest.artifact.sha256}`, `PackageSHA256=${releaseManifest.artifact.sha256}`),
  });

  assert.throws(
    () =>
      verifyApprovalComment({
        approvalComment: approval,
        manifest: releaseManifest,
        expectedCommentId: '999999',
        preparedRunId: '987654',
        preparedArtifactId: '24680',
        currentWorkflowCommit: releaseManifest.release.finalWorkflowCommit,
        issueComments: [],
        approvalIssueComments: [packet],
        sourceIssueComments: [
          {
            id: 222,
            created_at: '2026-09-01T12:02:00Z',
            body: '[MbpEnvironmentGate] Project=gr-agent-led-dev-delivery | Phase=Stage | Result=PASS | GitHub=https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/200',
          },
        ],
      }),
    /Approval packet is stale: MBP_STAGE_EVIDENCE_CHANGED/,
  );
});

test('approval gate accepts tracker-scoped n8n publish approval packet', () => {
  const summary = verifyApprovalComment({
    approvalComment: approvalComment({
      id: 5472749366,
      issue_url: `https://api.github.com/repos/${manifest.approval.repository}/issues/17`,
      body: [
        '[ProductionApproval]',
        'Decision=APPROVED',
        `Package=${manifest.package.name}`,
        `Version=${manifest.package.version}`,
        `Commit=${manifest.source.commit}`,
        `FinalReleaseCommit=${manifest.release.finalWorkflowCommit}`,
        `PackageSHA256=${manifest.artifact.sha256}`,
        'AuthorizedActions=npm publish and n8n Creator Portal submission',
        'PreparedRunID=33348507611',
        'PreparedArtifactID=9742811058',
        'ApprovedBy=alainhl',
      ].join('\n'),
    }),
    manifest,
    expectedCommentId: '5472749366',
    preparedRunId: '33348507611',
    preparedArtifactId: '9742811058',
    issueComments: [],
    currentWorkflowCommit: manifest.release.finalWorkflowCommit,
  });

  assert.equal(summary.approvalAuthor, 'alainhl');
  assert.equal(summary.fields.AuthorizedActions, manifest.approval.requiredAuthorizedAction);
});

test('publication evidence includes durable release identity and registry provenance fields', () => {
  const evidence = buildPublicationEvidence({
    manifest,
    status: 'PUBLISHED',
    preparedRunId: '987654',
    preparedArtifactId: '24680',
    approvalCommentId: '123456',
    workflowRunId: '112233',
    workflowRunAttempt: '1',
    workflowUrl: 'https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/actions/runs/112233',
    manifestCommit: '1234567890abcdef1234567890abcdef12345678',
    registrySummary: {
      status: 'published',
      dist: {
        integrity: manifest.artifact.sha512,
        tarball: 'https://registry.npmjs.org/n8n-nodes-genius-referrals/-/n8n-nodes-genius-referrals-0.1.0.tgz',
        attestations: { url: 'https://registry.npmjs.org/-/npm/v1/attestations/n8n-nodes-genius-referrals@0.1.0' },
      },
      tarball: {
        sha256: manifest.artifact.sha256,
      },
    },
  });

  assert.match(evidence, /^\[PublicationEvidence\]/);
  assert.match(evidence, new RegExp(`Package=${manifest.package.name}`));
  assert.match(evidence, new RegExp(`Version=${manifest.package.version}`));
  assert.match(evidence, /ManifestCommit=1234567890abcdef1234567890abcdef12345678/);
  assert.match(evidence, new RegExp(`FinalReleaseCommit=${manifest.release.finalWorkflowCommit}`));
  assert.match(evidence, new RegExp(`ReleaseWorkflowCommit=${manifest.release.finalWorkflowCommit}`));
  assert.match(evidence, new RegExp(`PackageSHA256=${manifest.artifact.sha256}`));
  assert.match(evidence, /PreparedRunID=987654/);
  assert.match(evidence, /PreparedArtifactID=24680/);
  assert.match(evidence, /WorkflowURL=https:\/\/github\.com\/GeniusReferrals\/n8n-nodes-genius-referrals\/actions\/runs\/112233/);
  assert.match(evidence, /RegistryIntegrity=sha512-/);
  assert.match(evidence, /Provenance=requested; registryAttestations=/);
  assert.match(evidence, /IdempotentSkip=FALSE/);
});

test('unsupported npm versions fail closed', () => {
  assert.throws(() => assertSupportedToolchain('v24.16.0', '11.4.9'), /Unsupported npm version/);
  assert.throws(() => assertSupportedToolchain('v22.23.2', '11.5.1'), /Unsupported Node.js version/);
});

test('release preparation enforces real n8n lint and refuses npm tokens', () => {
  const packageJson = require('../package.json');
  const verifier = require('node:fs').readFileSync('scripts/verify-approved-release.cjs', 'utf8');

  assert.equal(packageJson.scripts.lint, 'n8n-node lint');
  assert.equal(
    packageJson.scripts['release:scan-community'],
    'node scripts/verify-community-scan.cjs --manifest release-manifest.json',
  );
  assert.equal(verifier.includes("summary.commands.push('npm run lint: PASS')"), true);
  assert.throws(() => assertNoNpmTokenEnv({ NPM_TOKEN: 'secret' }), /must not be present/);
  assert.doesNotThrow(() => assertNoNpmTokenEnv({}));
});

test('release preparation can recover manifest source commit from a shallow checkout', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-shallow-source-'));
  const sourceDir = join(dir, 'source');
  const remoteDir = join(dir, 'remote.git');
  const shallowDir = join(dir, 'shallow');

  try {
    execFileSync('git', ['init', sourceDir], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: sourceDir });
    execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: sourceDir });
    writeFileSync(join(sourceDir, 'package.json'), '{"name":"fixture","version":"1.0.0"}\n');
    execFileSync('git', ['add', 'package.json'], { cwd: sourceDir });
    execFileSync('git', ['commit', '-m', 'initial package source'], { cwd: sourceDir, stdio: 'ignore' });
    const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceDir, encoding: 'utf8' }).trim();

    writeFileSync(join(sourceDir, 'README.md'), 'release metadata commit\n');
    execFileSync('git', ['add', 'README.md'], { cwd: sourceDir });
    execFileSync('git', ['commit', '-m', 'release metadata'], { cwd: sourceDir, stdio: 'ignore' });

    execFileSync('git', ['clone', '--bare', sourceDir, remoteDir], { stdio: 'ignore' });
    execFileSync('git', ['clone', '--depth', '1', `file://${remoteDir}`, shallowDir], { stdio: 'ignore' });

    assert.equal(commitExists(shallowDir, sourceCommit), false);

    const result = ensureGitCommitAvailable(shallowDir, sourceCommit);

    assert.equal(result.available, true);
    assert.equal(result.fetched, true);
    assert.equal(commitExists(shallowDir, sourceCommit), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('community scan gate runs exact scanner command and fails closed on scanner output', () => {
  const scanner = require('node:fs').readFileSync('scripts/verify-community-scan.cjs', 'utf8');

  assert.equal(scanner.includes("'@n8n/scan-community-package@beta', manifest.package.name"), true);
  assert.equal(scanOutputPassed('Package n8n-nodes-genius-referrals has failed security checks'), false);
  assert.equal(scanOutputPassed('Package n8n-nodes-genius-referrals passed security checks'), true);
});

test('release preparation treats exact already-published dry-run conflict as registry readback', () => {
  const error = {
    message: `npm publish --dry-run failed: You cannot publish over the previously published versions: ${manifest.package.version}.`,
  };
  const otherVersionError = {
    message: 'npm publish --dry-run failed: You cannot publish over the previously published versions: 9.9.9.',
  };

  assert.equal(isAlreadyPublishedDryRunError(error, manifest), true);
  assert.equal(isAlreadyPublishedDryRunError(otherVersionError, manifest), false);
  assert.deepEqual(
    parseNpmViewDist(JSON.stringify({
      'dist.integrity': manifest.artifact.sha512,
      'dist.tarball': `https://registry.npmjs.org/${manifest.package.name}/-/${manifest.package.name}-${manifest.package.version}.tgz`,
    })),
    {
      integrity: manifest.artifact.sha512,
      tarball: `https://registry.npmjs.org/${manifest.package.name}/-/${manifest.package.name}-${manifest.package.version}.tgz`,
    },
  );
});

test('publication workflow gates Creator Portal evidence on community package scan', () => {
  const workflow = require('node:fs').readFileSync('.github/workflows/publish-n8n-node.yml', 'utf8');
  const idempotentScanIndex = workflow.indexOf('Scan community package before Creator Portal evidence');
  const idempotentEvidenceIndex = workflow.indexOf('Record idempotent success');
  const publishScanIndex = workflow.lastIndexOf('Scan community package before Creator Portal evidence');
  const publishEvidenceIndex = workflow.indexOf('Record publication evidence');

  assert.notEqual(idempotentScanIndex, -1);
  assert.notEqual(publishScanIndex, -1);
  assert.equal(workflow.includes('npm run release:scan-community'), true);
  assert.equal(idempotentScanIndex < idempotentEvidenceIndex, true);
  assert.equal(publishScanIndex < publishEvidenceIndex, true);
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
