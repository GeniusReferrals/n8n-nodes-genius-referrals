'use strict';

const { createHash } = require('node:crypto');
const { existsSync, readFileSync, readdirSync, statSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const MIN_NODE_MAJOR = 24;
const MIN_NPM_VERSION = '11.5.1';

function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJsonFile(path, value) {
  if (path) {
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value.trim();
}

function requireInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }

  return value;
}

function readReleaseManifest(manifestPath) {
  const resolvedPath = resolve(manifestPath);
  const manifest = readJsonFile(resolvedPath);

  const normalized = {
    schemaVersion: requireInteger(manifest.schemaVersion, 'schemaVersion'),
    package: {
      name: requireString(manifest.package?.name, 'package.name'),
      version: requireString(manifest.package?.version, 'package.version'),
    },
    source: {
      commit: requireString(manifest.source?.commit, 'source.commit'),
    },
    release: {
      finalWorkflowCommit: requireString(manifest.release?.finalWorkflowCommit, 'release.finalWorkflowCommit'),
    },
    artifact: {
      sha256: requireString(manifest.artifact?.sha256, 'artifact.sha256').toLowerCase(),
      sha512: manifest.artifact?.sha512 === null || manifest.artifact?.sha512 === undefined
        ? null
        : requireString(manifest.artifact.sha512, 'artifact.sha512'),
    },
    approval: {
      repository: requireString(manifest.approval?.repository, 'approval.repository'),
      issueNumber: requireInteger(manifest.approval?.issueNumber, 'approval.issueNumber'),
      requiredAuthor: requireString(manifest.approval?.requiredAuthor, 'approval.requiredAuthor'),
      requiredMarker: requireString(manifest.approval?.requiredMarker, 'approval.requiredMarker'),
      requiredDecision: requireString(manifest.approval?.requiredDecision, 'approval.requiredDecision'),
      requiredAuthorizedAction: requireString(
        manifest.approval?.requiredAuthorizedAction,
        'approval.requiredAuthorizedAction',
      ),
    },
    publication: {
      evidenceIssueNumber: requireInteger(manifest.publication?.evidenceIssueNumber, 'publication.evidenceIssueNumber'),
      environment: requireString(manifest.publication?.environment, 'publication.environment'),
      secretName: requireString(manifest.publication?.secretName, 'publication.secretName'),
      provenance: manifest.publication?.provenance === true,
    },
    manifestPath: resolvedPath,
  };

  if (normalized.schemaVersion !== 1) {
    throw new Error(`Unsupported release manifest schemaVersion ${normalized.schemaVersion}`);
  }

  if (!/^[0-9a-f]{40}$/i.test(normalized.source.commit)) {
    throw new Error('source.commit must be a full 40-character Git SHA');
  }

  if (!/^[0-9a-f]{40}$/i.test(normalized.release.finalWorkflowCommit)) {
    throw new Error('release.finalWorkflowCommit must be a full 40-character Git SHA');
  }

  if (!/^[0-9a-f]{64}$/i.test(normalized.artifact.sha256)) {
    throw new Error('artifact.sha256 must be a 64-character SHA-256 hex digest');
  }

  if (normalized.artifact.sha512 !== null && !/^sha512-[A-Za-z0-9+/=]+$/.test(normalized.artifact.sha512)) {
    throw new Error('artifact.sha512 must be an npm integrity value beginning with sha512-');
  }

  return normalized;
}

function compareSemver(actual, minimum) {
  const actualParts = actual.split('.').map((part) => Number.parseInt(part, 10));
  const minimumParts = minimum.split('.').map((part) => Number.parseInt(part, 10));

  for (let index = 0; index < 3; index += 1) {
    const actualPart = actualParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;

    if (actualPart > minimumPart) {
      return 1;
    }

    if (actualPart < minimumPart) {
      return -1;
    }
  }

  return 0;
}

function assertSupportedToolchain(nodeVersion, npmVersion) {
  const cleanNodeVersion = nodeVersion.replace(/^v/, '');
  const nodeMajor = Number.parseInt(cleanNodeVersion.split('.')[0], 10);

  if (nodeMajor !== MIN_NODE_MAJOR) {
    throw new Error(`Unsupported Node.js version ${nodeVersion}; expected Node ${MIN_NODE_MAJOR}.x`);
  }

  if (compareSemver(npmVersion, MIN_NPM_VERSION) < 0) {
    throw new Error(`Unsupported npm version ${npmVersion}; expected npm ${MIN_NPM_VERSION} or newer`);
  }
}

function assertNoNpmTokenEnv(env = process.env) {
  if (env.NPM_TOKEN || env.NODE_AUTH_TOKEN) {
    throw new Error('NPM_TOKEN/NODE_AUTH_TOKEN must not be present during release preparation or dry-run validation');
  }
}

function shaFile(path, algorithm) {
  return createHash(algorithm).update(readFileSync(path)).digest(algorithm === 'sha512' ? 'base64' : 'hex');
}

function sha256File(path) {
  return shaFile(path, 'sha256');
}

function sha512IntegrityFile(path) {
  return `sha512-${shaFile(path, 'sha512')}`;
}

function parseStructuredFields(body) {
  const lines = String(body ?? '').split(/\r?\n/);
  const fields = {};
  let hasProductionApprovalMarker = false;
  let hasPublicationEvidenceMarker = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '[ProductionApproval]') {
      hasProductionApprovalMarker = true;
      continue;
    }

    if (line === '[PublicationEvidence]') {
      hasPublicationEvidenceMarker = true;
      continue;
    }

    if (line === '' || line.startsWith('#') || line.startsWith('- ')) {
      continue;
    }

    const match = /^([A-Za-z][A-Za-z0-9]+)=(.+)$/.exec(line);
    if (!match) {
      continue;
    }

    const key = match[1];
    const value = match[2].trim();
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      throw new Error(`Duplicate structured approval field: ${key}`);
    }

    fields[key] = value;
  }

  return {
    fields,
    hasProductionApprovalMarker,
    hasPublicationEvidenceMarker,
  };
}

function fieldValue(fields, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(fields, name)) {
      return fields[name];
    }
  }

  return undefined;
}

function actionListIncludes(value, requiredAction) {
  return String(value ?? '')
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase())
    .includes(requiredAction.toLowerCase());
}

function assertIssueUrlMatches(issueUrl, manifest) {
  const expected = `https://api.github.com/repos/${manifest.approval.repository}/issues/${manifest.approval.issueNumber}`;

  if (issueUrl !== expected) {
    throw new Error(`Approval comment belongs to ${issueUrl}; expected ${expected}`);
  }
}

function normalizeHexField(value) {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

function assertPreparedArtifactNotConsumedForDifferentRelease(comments, manifest, preparedRunId, preparedArtifactId) {
  if (!preparedRunId || !preparedArtifactId) {
    return;
  }

  for (const comment of comments ?? []) {
    const parsed = parseStructuredFields(comment.body ?? '');
    if (!parsed.hasPublicationEvidenceMarker) {
      continue;
    }

    const fields = parsed.fields;
    const commentRunId = fieldValue(fields, ['PreparedRunID', 'WorkflowRunID', 'RunID']);
    const commentArtifactId = fieldValue(fields, ['PreparedArtifactID', 'ArtifactID']);

    if (commentRunId !== String(preparedRunId) || commentArtifactId !== String(preparedArtifactId)) {
      continue;
    }

    const sameRelease =
      fieldValue(fields, ['Package']) === manifest.package.name &&
      fieldValue(fields, ['Version']) === manifest.package.version &&
      normalizeHexField(fieldValue(fields, ['Commit', 'ManifestCommit', 'SourceCommit'])) === manifest.source.commit &&
      normalizeHexField(fieldValue(fields, ['FinalReleaseCommit', 'ReleaseWorkflowCommit', 'FinalWorkflowCommit', 'WorkflowCommit'])) ===
        manifest.release.finalWorkflowCommit &&
      normalizeHexField(fieldValue(fields, ['PackageSHA256', 'SHA256'])) === manifest.artifact.sha256;

    if (!sameRelease) {
      throw new Error(
        `Prepared artifact ${preparedRunId}/${preparedArtifactId} was already consumed for a different release`,
      );
    }
  }
}

function verifyApprovalComment({
  approvalComment,
  manifest,
  expectedCommentId,
  preparedRunId,
  preparedArtifactId,
  currentWorkflowCommit,
  issueComments = [],
}) {
  if (expectedCommentId && String(approvalComment.id) !== String(expectedCommentId)) {
    throw new Error(`Fetched approval comment ${approvalComment.id}; expected ${expectedCommentId}`);
  }

  if (approvalComment.user?.login !== manifest.approval.requiredAuthor) {
    throw new Error(
      `Approval comment author is ${approvalComment.user?.login ?? 'unknown'}; expected ${manifest.approval.requiredAuthor}`,
    );
  }

  assertIssueUrlMatches(approvalComment.issue_url, manifest);

  const parsed = parseStructuredFields(approvalComment.body ?? '');
  if (!parsed.hasProductionApprovalMarker) {
    throw new Error(`Approval comment must contain exact ${manifest.approval.requiredMarker} marker`);
  }

  const fields = parsed.fields;
  const checks = [
    ['Decision', manifest.approval.requiredDecision],
    ['Package', manifest.package.name],
    ['Version', manifest.package.version],
    ['Commit', manifest.source.commit],
    ['FinalReleaseCommit', manifest.release.finalWorkflowCommit],
    ['PackageSHA256', manifest.artifact.sha256],
  ];

  for (const [field, expected] of checks) {
    const actual = fields[field];
    const normalizedActual = ['Commit', 'FinalReleaseCommit', 'PackageSHA256'].includes(field)
      ? normalizeHexField(actual)
      : actual;

    if (normalizedActual !== expected) {
      throw new Error(`Approval ${field} mismatch. Expected ${expected}, got ${actual ?? 'missing'}`);
    }
  }

  if (currentWorkflowCommit && normalizeHexField(currentWorkflowCommit) !== manifest.release.finalWorkflowCommit) {
    throw new Error(
      `Release workflow commit mismatch. Expected ${manifest.release.finalWorkflowCommit}, got ${currentWorkflowCommit}`,
    );
  }

  if (!actionListIncludes(fields.AuthorizedActions, manifest.approval.requiredAuthorizedAction)) {
    throw new Error(`AuthorizedActions must include ${manifest.approval.requiredAuthorizedAction}`);
  }

  const approvedRunId = fieldValue(fields, ['PreparedRunID', 'WorkflowRunID', 'RunID']);
  const approvedArtifactId = fieldValue(fields, ['PreparedArtifactID', 'ArtifactID']);

  if (preparedRunId && approvedRunId !== String(preparedRunId)) {
    throw new Error(`Approved workflow run mismatch. Expected ${preparedRunId}, got ${approvedRunId ?? 'missing'}`);
  }

  if (preparedArtifactId && approvedArtifactId !== String(preparedArtifactId)) {
    throw new Error(
      `Approved artifact ID mismatch. Expected ${preparedArtifactId}, got ${approvedArtifactId ?? 'missing'}`,
    );
  }

  assertPreparedArtifactNotConsumedForDifferentRelease(issueComments, manifest, preparedRunId, preparedArtifactId);

  return {
    approvalCommentId: String(approvalComment.id),
    approvalAuthor: approvalComment.user.login,
    issueUrl: approvalComment.issue_url,
    fields,
  };
}

function listTarballs(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const results = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...listTarballs(fullPath));
    } else if (entry.endsWith('.tgz')) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

function findSingleTarball(dir) {
  const tarballs = listTarballs(dir);

  if (tarballs.length !== 1) {
    throw new Error(`Expected exactly one prepared tarball in ${dir}, found ${tarballs.length}`);
  }

  return tarballs[0];
}

function verifyPreparedArtifact({
  manifest,
  artifactDir,
  preparedRunId,
  preparedArtifactId,
  preparationSummaryPath,
}) {
  const tarballPath = findSingleTarball(artifactDir);
  const computedSha256 = sha256File(tarballPath);
  const computedSha512 = sha512IntegrityFile(tarballPath);

  if (computedSha256 !== manifest.artifact.sha256) {
    throw new Error(`Prepared tarball SHA-256 mismatch. Expected ${manifest.artifact.sha256}, got ${computedSha256}`);
  }

  if (manifest.artifact.sha512 && computedSha512 !== manifest.artifact.sha512) {
    throw new Error(`Prepared tarball SHA-512 mismatch. Expected ${manifest.artifact.sha512}, got ${computedSha512}`);
  }

  const summary = preparationSummaryPath && existsSync(preparationSummaryPath)
    ? readJsonFile(preparationSummaryPath)
    : null;

  if (summary) {
    const summaryChecks = [
      ['package.name', summary.package?.name, manifest.package.name],
      ['package.version', summary.package?.version, manifest.package.version],
      ['source.commit', summary.source?.commit, manifest.source.commit],
      ['tarball.sha256', summary.tarball?.sha256, manifest.artifact.sha256],
    ];

    for (const [label, actual, expected] of summaryChecks) {
      if (actual !== expected) {
        throw new Error(`Preparation summary ${label} mismatch. Expected ${expected}, got ${actual ?? 'missing'}`);
      }
    }

    if (preparedRunId && summary.workflow?.runId && String(summary.workflow.runId) !== String(preparedRunId)) {
      throw new Error(`Preparation summary run ID mismatch. Expected ${preparedRunId}, got ${summary.workflow.runId}`);
    }

    if (
      preparedArtifactId &&
      summary.workflow?.artifactId &&
      String(summary.workflow.artifactId) !== String(preparedArtifactId)
    ) {
      throw new Error(
        `Preparation summary artifact ID mismatch. Expected ${preparedArtifactId}, got ${summary.workflow.artifactId}`,
      );
    }
  }

  return {
    tarballPath,
    sha256: computedSha256,
    sha512: computedSha512,
    summary,
  };
}

function buildPublicationEvidence({
  manifest,
  status,
  preparedRunId,
  preparedArtifactId,
  approvalCommentId,
  workflowRunId,
  workflowRunAttempt,
  workflowUrl,
  manifestCommit,
  registrySummary = null,
  preparedArtifactSummary = null,
}) {
  const registryIntegrity = registrySummary?.dist?.integrity ?? registrySummary?.tarball?.sha512 ?? 'unavailable';
  const registryTarballSha256 = registrySummary?.tarball?.sha256 ?? preparedArtifactSummary?.tarball?.sha256 ?? manifest.artifact.sha256;
  const registryTarballUrl = registrySummary?.dist?.tarball ?? 'unavailable';
  const registryAttestations = registrySummary?.dist?.attestations
    ? JSON.stringify(registrySummary.dist.attestations)
    : 'unavailable';
  const provenanceEvidence = manifest.publication.provenance
    ? `requested; registryAttestations=${registryAttestations}`
    : 'not-requested';

  return [
    '[PublicationEvidence]',
    `Status=${status}`,
    `Package=${manifest.package.name}`,
    `Version=${manifest.package.version}`,
    `Commit=${manifest.source.commit}`,
    `ManifestCommit=${manifestCommit ?? manifest.source.commit}`,
    `SourceCommit=${manifest.source.commit}`,
    `FinalReleaseCommit=${manifest.release.finalWorkflowCommit}`,
    `ReleaseWorkflowCommit=${manifest.release.finalWorkflowCommit}`,
    `FinalWorkflowCommit=${manifest.release.finalWorkflowCommit}`,
    `PackageSHA256=${manifest.artifact.sha256}`,
    `PackageSHA512=${manifest.artifact.sha512 ?? ''}`,
    `PreparedRunID=${preparedRunId}`,
    `PreparedArtifactID=${preparedArtifactId}`,
    `ApprovalCommentID=${approvalCommentId}`,
    `WorkflowRunID=${workflowRunId}`,
    `WorkflowRunAttempt=${workflowRunAttempt ?? 'unknown'}`,
    `WorkflowURL=${workflowUrl}`,
    `RegistryStatus=${registrySummary?.status ?? 'unknown'}`,
    `RegistryIntegrity=${registryIntegrity}`,
    `RegistryTarballSHA256=${registryTarballSha256}`,
    `RegistryTarballURL=${registryTarballUrl}`,
    `Provenance=${provenanceEvidence}`,
    `IdempotentSkip=${status === 'SKIPPED_ALREADY_PUBLISHED' ? 'TRUE' : 'FALSE'}`,
  ].join('\n');
}

function classifyRegistryVersion(metadata, manifest, allowMissing) {
  if (!metadata) {
    return allowMissing ? 'missing' : 'missing-fail';
  }

  const versionMetadata = metadata.versions?.[manifest.package.version];
  if (!versionMetadata) {
    return allowMissing ? 'missing-version' : 'missing-version-fail';
  }

  return 'published';
}

function assertPublishTokenForMode(mode, env = process.env, secretName = 'NPM_TOKEN') {
  if (mode !== 'real') {
    return;
  }

  if (!env[secretName] && !env.NODE_AUTH_TOKEN) {
    throw new Error(`${secretName} is required for real publish mode`);
  }
}

module.exports = {
  MIN_NODE_MAJOR,
  MIN_NPM_VERSION,
  assertNoNpmTokenEnv,
  assertPublishTokenForMode,
  assertSupportedToolchain,
  classifyRegistryVersion,
  buildPublicationEvidence,
  parseStructuredFields,
  readJsonFile,
  readReleaseManifest,
  sha256File,
  sha512IntegrityFile,
  verifyApprovalComment,
  verifyPreparedArtifact,
  writeJsonFile,
};
