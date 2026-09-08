'use strict';

const { get } = require('node:https');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  buildApprovalPacketFreshnessReport,
  readReleaseManifest,
  verifyApprovalComment,
  writeJsonFile,
} = require('./release-controls.cjs');

function parseArgs(argv) {
  const options = {
    manifestPath: 'release-manifest.json',
    commentId: null,
    preparedRunId: null,
    preparedArtifactId: null,
    currentWorkflowCommit: process.env.GITHUB_SHA || null,
    summaryFile: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }

      return argv[index];
    };

    if (arg === '--manifest') {
      options.manifestPath = next();
    } else if (arg === '--comment-id') {
      options.commentId = next();
    } else if (arg === '--prepared-run-id') {
      options.preparedRunId = next();
    } else if (arg === '--prepared-artifact-id') {
      options.preparedArtifactId = next();
    } else if (arg === '--current-workflow-commit') {
      options.currentWorkflowCommit = next();
    } else if (arg === '--summary-file') {
      options.summaryFile = resolve(next());
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.commentId || !/^[0-9]+$/.test(options.commentId)) {
    throw new Error('--comment-id must be a numeric GitHub issue comment ID');
  }

  if (!options.preparedRunId || !/^[0-9]+$/.test(options.preparedRunId)) {
    throw new Error('--prepared-run-id must be a numeric GitHub Actions run ID');
  }

  if (!options.preparedArtifactId || !/^[0-9]+$/.test(options.preparedArtifactId)) {
    throw new Error('--prepared-artifact-id must be a numeric GitHub Actions artifact ID');
  }

  return options;
}

function issueCommentsPath(repository, issueNumber, page = 1) {
  return `/repos/${repository}/issues/${issueNumber}/comments?per_page=100&page=${page}`;
}

function parseSourceIssueNumber(packetReport) {
  return packetReport?.affected?.sourceIssueNumber ?? null;
}

function stableReleaseAutomationCommit(currentWorkflowCommit, execute = execFileSync) {
  try {
    const resolved = String(execute(
      'git',
      [
        'log',
        '--no-merges',
        '-n',
        '1',
        '--format=%H',
        '--',
        '.github/workflows/publish-n8n-node.yml',
        'scripts',
      ],
      { encoding: 'utf8' },
    )).trim();
    if (/^[0-9a-f]{40}$/i.test(resolved)) return resolved;
  } catch {
    // Local callers without Git metadata retain the supplied fail-closed value.
  }

  return currentWorkflowCommit;
}

function githubGetJson(path, token) {
  return new Promise((resolvePromise, reject) => {
    get(
      `https://api.github.com${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'n8n-nodes-genius-referrals-release-gate',
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`GitHub API GET ${path} failed with HTTP ${response.statusCode}: ${body}`));
            return;
          }

          try {
            resolvePromise(JSON.parse(body));
          } catch (error) {
            reject(new Error(`Unable to parse GitHub API response for ${path}: ${error.message}`));
          }
        });
      },
    ).on('error', reject);
  });
}

async function listIssueComments(repository, issueNumber, token, requestJson = githubGetJson) {
  const comments = [];
  let page = 1;

  while (true) {
    const pageComments = await requestJson(issueCommentsPath(repository, issueNumber, page), token);
    if (!Array.isArray(pageComments)) {
      throw new Error(`GitHub issue comments response for ${repository}#${issueNumber} page ${page} was not an array`);
    }
    comments.push(...pageComments);
    if (pageComments.length < 100) return comments;
    page += 1;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const currentWorkflowCommit = stableReleaseAutomationCommit(options.currentWorkflowCommit);
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to verify the production approval comment');
  }

  const manifest = readReleaseManifest(options.manifestPath);
  const approvalComment = await githubGetJson(
    `/repos/${manifest.approval.repository}/issues/comments/${options.commentId}`,
    token,
  );
  const approvalIssueComments = await listIssueComments(
    manifest.approval.repository,
    manifest.approval.issueNumber,
    token,
  );
  const issueComments = await listIssueComments(
    manifest.approval.repository,
    manifest.publication.evidenceIssueNumber,
    token,
  );
  const initialFreshnessReport = buildApprovalPacketFreshnessReport({
    approvalComment,
    manifest,
    preparedRunId: options.preparedRunId,
    preparedArtifactId: options.preparedArtifactId,
    approvalIssueComments,
    publicationIssueComments: issueComments,
  });
  const sourceIssueNumber = parseSourceIssueNumber(initialFreshnessReport);
  const sourceIssueComments = sourceIssueNumber
    ? await listIssueComments(manifest.approval.repository, sourceIssueNumber, token)
    : [];
  const freshnessReport = buildApprovalPacketFreshnessReport({
    approvalComment,
    manifest,
    preparedRunId: options.preparedRunId,
    preparedArtifactId: options.preparedArtifactId,
    approvalIssueComments,
    sourceIssueComments,
    publicationIssueComments: issueComments,
  });

  if (options.dryRun) {
    writeJsonFile(options.summaryFile, {
      status: freshnessReport.stale ? 'stale' : 'fresh',
      mode: 'dry-run',
      manifestPath: manifest.manifestPath,
      package: manifest.package,
      source: manifest.source,
      release: manifest.release,
      currentWorkflowCommit,
      preparedRunId: options.preparedRunId,
      preparedArtifactId: options.preparedArtifactId,
      approvalComment: {
        id: String(approvalComment.id),
        author: approvalComment.user?.login ?? 'unknown',
        url: approvalComment.html_url ?? null,
        createdAt: approvalComment.created_at ?? null,
      },
      freshness: freshnessReport,
    });

    const affected = freshnessReport.affected;
    console.log(
      [
        `Approval packet freshness dry-run: ${freshnessReport.stale ? 'STALE' : 'FRESH'}`,
        `Repository=${affected.repository}`,
        `ApprovalIssue=${affected.approvalIssueNumber}`,
        `SourceIssue=${affected.sourceIssueNumber ?? 'unknown'}`,
        `PullRequest=${affected.pullRequestNumber ?? 'unknown'}`,
        `PublicationIssue=${affected.publicationEvidenceIssueNumber}`,
        `PacketComment=${affected.packetCommentId ?? 'missing'}`,
        `StaleReasons=${freshnessReport.staleReasons.map((reason) => reason.reason).join(',') || 'none'}`,
      ].join('\n'),
    );
    return;
  }

  const summary = verifyApprovalComment({
    approvalComment,
    manifest,
    expectedCommentId: options.commentId,
    preparedRunId: options.preparedRunId,
    preparedArtifactId: options.preparedArtifactId,
    currentWorkflowCommit,
    issueComments,
    approvalIssueComments,
    sourceIssueComments,
  });

  writeJsonFile(options.summaryFile, {
    status: 'passed',
    manifestPath: manifest.manifestPath,
    package: manifest.package,
    source: manifest.source,
    release: manifest.release,
    currentWorkflowCommit,
    preparedRunId: options.preparedRunId,
    preparedArtifactId: options.preparedArtifactId,
    approval: summary,
  });
  console.log(`Verified production approval comment ${options.commentId}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  issueCommentsPath,
  listIssueComments,
  stableReleaseAutomationCommit,
};
