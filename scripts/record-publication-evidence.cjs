'use strict';

const { get, request } = require('node:https');
const { resolve } = require('node:path');

const {
  buildPublicationEvidence,
  readJsonFile,
  readReleaseManifest,
  writeJsonFile,
} = require('./release-controls.cjs');

function parseArgs(argv) {
  const options = {
    manifestPath: 'release-manifest.json',
    status: null,
    approvalCommentId: null,
    preparedRunId: null,
    preparedArtifactId: null,
    preparedArtifactSummaryFile: null,
    registrySummaryFile: null,
    summaryFile: null,
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
    } else if (arg === '--status') {
      options.status = next();
    } else if (arg === '--approval-comment-id') {
      options.approvalCommentId = next();
    } else if (arg === '--prepared-run-id') {
      options.preparedRunId = next();
    } else if (arg === '--prepared-artifact-id') {
      options.preparedArtifactId = next();
    } else if (arg === '--prepared-artifact-summary-file') {
      options.preparedArtifactSummaryFile = resolve(next());
    } else if (arg === '--registry-summary-file') {
      options.registrySummaryFile = resolve(next());
    } else if (arg === '--summary-file') {
      options.summaryFile = resolve(next());
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.status) {
    throw new Error('--status is required');
  }

  for (const [label, value] of [
    ['--approval-comment-id', options.approvalCommentId],
    ['--prepared-run-id', options.preparedRunId],
    ['--prepared-artifact-id', options.preparedArtifactId],
  ]) {
    if (!value || !/^[0-9]+$/.test(value)) {
      throw new Error(`${label} must be numeric`);
    }
  }

  return options;
}

function githubRequestJson(method, path, token, body = null) {
  return new Promise((resolvePromise, reject) => {
    const payload = body === null ? null : JSON.stringify(body);
    const req = request(
      `https://api.github.com${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'Content-Length': payload ? Buffer.byteLength(payload) : 0,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'n8n-nodes-genius-referrals-publication-evidence',
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`GitHub API ${method} ${path} failed with HTTP ${response.statusCode}: ${responseBody}`));
            return;
          }

          try {
            resolvePromise(responseBody ? JSON.parse(responseBody) : null);
          } catch (error) {
            reject(new Error(`Unable to parse GitHub API response for ${path}: ${error.message}`));
          }
        });
      },
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
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
          'User-Agent': 'n8n-nodes-genius-referrals-publication-evidence',
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

function workflowUrl() {
  if (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID) {
    return `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  }

  return 'unknown';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to record publication evidence');
  }

  const manifest = readReleaseManifest(options.manifestPath);
  const registrySummary = options.registrySummaryFile ? readJsonFile(options.registrySummaryFile) : null;
  const preparedArtifactSummary = options.preparedArtifactSummaryFile
    ? readJsonFile(options.preparedArtifactSummaryFile)
    : null;
  const evidence = buildPublicationEvidence({
    manifest,
    status: options.status,
    preparedRunId: options.preparedRunId,
    preparedArtifactId: options.preparedArtifactId,
    approvalCommentId: options.approvalCommentId,
    workflowRunId: process.env.GITHUB_RUN_ID ?? 'unknown',
    workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? 'unknown',
    workflowUrl: workflowUrl(),
    manifestCommit: process.env.GITHUB_SHA ?? 'unknown',
    registrySummary,
    preparedArtifactSummary,
  });

  const existingComments = await githubGetJson(
    `/repos/${manifest.approval.repository}/issues/${manifest.publication.evidenceIssueNumber}/comments?per_page=100`,
    token,
  );
  const existing = existingComments.find((comment) => comment.body === evidence);
  const comment = existing || await githubRequestJson(
    'POST',
    `/repos/${manifest.approval.repository}/issues/${manifest.publication.evidenceIssueNumber}/comments`,
    token,
    { body: evidence },
  );

  writeJsonFile(options.summaryFile, {
    status: existing ? 'already-recorded' : 'recorded',
    commentId: String(comment.id),
    issueNumber: manifest.publication.evidenceIssueNumber,
    package: manifest.package,
    source: manifest.source,
    release: manifest.release,
    evidence,
  });

  console.log(`${existing ? 'Reused' : 'Recorded'} publication evidence comment ${comment.id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
