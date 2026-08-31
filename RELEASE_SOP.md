# Release SOP

## Scope

This SOP covers the production release path for the `n8n-nodes-genius-referrals`
npm package. Publication must happen only through GitHub Actions, using a
release manifest and Alain's structured GitHub production approval. Do not
publish from a local machine, Discord, a Project field, the n8n Creator Portal,
or any other non-GitHub-Actions surface.

The current release manifest is `release-manifest.json`. It is the per-release
source for package name, version, source commit, final release/workflow commit,
expected package checksum, approval issue, GitHub Environment name, and secret
name. The reusable workflow does not hard-code those release values.

Any mismatch in package name, version, source commit, final release/workflow
commit, prepared artifact ID, workflow run ID, or checksum fails closed.

## Release Preparation

Release preparation uses no npm credential and is safe for PR validation.

Run the workflow `.github/workflows/publish-n8n-node.yml` with
`release_action=prepare`, or run locally:

```bash
node scripts/verify-approved-release.cjs --manifest release-manifest.json
```

The preparation verifier uses a GitHub-hosted runner with Node 24 and npm
11.5.1 or newer. It refuses unsupported toolchains and refuses to run if
`NPM_TOKEN` or `NODE_AUTH_TOKEN` is present.

The verifier checks out the exact source commit from the release manifest in a
temporary clone, then runs:

1. `npm ci --include=dev`
2. `npm run build`
3. `npm run lint` using `n8n-node lint`
4. `npm test`
5. `npm pack`
6. `npm publish --dry-run --access public <prepared-tarball>`
7. SHA-256 and optional SHA-512 comparison against the release manifest

The preparation phase produces one canonical tarball and records package
identity, source commit, Node/npm versions, workflow run ID, file manifest,
tarball SHA-256, tarball SHA-512, npm pack integrity, and dry-run result. The
tarball and `release-preparation.json` are uploaded as the protected GitHub
Actions artifact that publication must reuse.

Before asking Alain for production approval, Aegis must preflight the manifest
freshness contract against the release branch or `main` revision that will run
the publication workflow:

```bash
git log -n 1 --format=%H -- .github/workflows/publish-n8n-node.yml scripts
```

That value must equal `release.finalWorkflowCommit` in `release-manifest.json`.
If it does not, refresh the manifest and rerun preparation before requesting
approval. Do not ask for approval, dispatch publish, or treat approval as
actionable while the manifest points at stale release automation.

## Production Approval

Real publication requires a GitHub issue comment authored by `alainhl` on the
production approval issue named in the release manifest. The workflow fetches
the comment through the GitHub API with `issues: read` permission and verifies
the API response, not a copied string.

The approval comment must contain exact structured fields:

```text
[ProductionApproval]
Decision=APPROVED
Package=<manifest package>
Version=<manifest version>
Commit=<manifest source commit>
FinalReleaseCommit=<manifest release finalWorkflowCommit>
PackageSHA256=<manifest tarball sha256>
AuthorizedActions=npm publish and n8n Creator Portal submission
PreparedRunID=<approved preparation workflow run id>
PreparedArtifactID=<approved prepared artifact id>
```

The gate rejects comments from bots or operators that merely contain
`ApprovedBy=alainhl`. It also rejects comments on the wrong issue, missing or
duplicated structured fields, mismatched artifact/run identity, publication
dispatches running different release automation than the manifest-approved
final release/workflow commit, and prepared artifacts already consumed for a
different release.

## Required GitHub Environment

Create a GitHub Environment named `npm-production`.

Purpose:

- isolate the temporary first-publication npm credential
- expose the credential only to the publication job
- avoid passing npm secret material to PR or dry-run validation

Do not add a second human reviewer gate to this environment unless Alain makes
that separate decision later. Alain's structured GitHub approval is the
production approval gate.

Temporary first-publication credential:

- Secret name: `NPM_TOKEN`
- Permission: publish permission sufficient for first publication of the
  unscoped package
- Scope: use the narrowest token npm allows for creating and publishing this
  first version
- Lifetime: 24 hours maximum, or revoke immediately after the first successful
  publication, whichever comes first

The npm credential must never be written to repository files, GitHub comments,
Project fields, Discord, prompts, command arguments, or OpenClaw credential
storage.

## Publication

Use only GitHub Actions for real publication:

1. Complete a passing preparation run and record its run ID and artifact ID.
2. Obtain Alain's structured `[ProductionApproval]` comment for that exact
   manifest, run ID, artifact ID, source commit, and checksum.
3. Add the temporary `NPM_TOKEN` secret to `npm-production`.
4. Dispatch `.github/workflows/publish-n8n-node.yml` with
   `release_action=publish`, `release_manifest_path`,
   `approval_comment_id`, `prepared_run_id`, and `prepared_artifact_id`.

The publication job downloads the exact prepared tarball from the approved run
and artifact ID. It recomputes checksum evidence before any registry action. It
does not rebuild a new tarball after approval.

Before artifact download or registry checks, the publication gate computes the
release automation commit from the checked-out workflow and release scripts and
requires it to match both `release.finalWorkflowCommit` in the manifest and
`FinalReleaseCommit` in Alain's structured approval packet. Manifest-only
follow-up commits may update the manifest to point at the current release
automation commit, but they must not edit `.github/workflows/publish-n8n-node.yml`
or `scripts/` in the same change. The workflow and release scripts themselves
must not change after the approved commit without a new manifest, preparation
artifact, and approval packet.

The real publish step runs:

```bash
npm publish <approved-prepared-tarball> --access public --provenance
```

The workflow has `id-token: write` permission so npm provenance can be
requested from the GitHub-hosted runner. The token is passed through
`NODE_AUTH_TOKEN` from `secrets.NPM_TOKEN`; the value is never echoed.

## Idempotency

Before any real publish attempt, the workflow checks the npm registry for the
manifest package and version.

If the version exists and the downloaded registry tarball has the manifest
SHA-256, the workflow writes durable `[PublicationEvidence]` to the release
issue, records success, and skips `npm publish`.

If the version exists with a different checksum, the workflow fails closed and
does not publish.

If the package or version is missing, the workflow proceeds to the protected
publish step.

## Post-Release Verification

After publication, run:

```bash
node scripts/verify-published-package.cjs --manifest release-manifest.json
```

The verifier checks:

- package exists on the npm registry
- version matches the release manifest
- registry tarball can be downloaded
- downloaded tarball SHA-256 matches the release manifest
- registry `dist.integrity`, `dist.shasum`, and attestation metadata are
  recorded when npm exposes them

The workflow summary must record workflow run URL, approval comment ID,
prepared run ID, prepared artifact ID, source commit, package version, package
checksum, registry verification result, and provenance/attestation evidence
where available.

The workflow must also write a durable `[PublicationEvidence]` issue comment to
the manifest publication issue. That record includes package, version, manifest
commit, source commit, final release/workflow commit, package checksum,
prepared run ID, prepared artifact ID, workflow run URL, registry integrity,
registry tarball checksum, provenance evidence when npm exposes it, and whether
publication was skipped idempotently because the exact version already existed.
Future publication gates use that issue record to refuse prepared artifact reuse
for a different release.

## Rollback And Deprecation Limits

npm publication is append-only for normal release operations. Do not depend on
unpublish as rollback.

If a bad package is published:

1. Stop further promotion and n8n Creator Portal submission.
2. Deprecate the bad version with clear guidance if needed.
3. Publish a corrected patch version only after a new issue, approval record,
   checksum, preparation artifact, and validation run exist.
4. Record impact, workflow run, package version, checksum, and corrective action
   in the release issue.

## n8n Creator Portal

Do not submit to the n8n Creator Portal in this implementation pass. Submission
can happen only after npm publication and post-release verification are
complete and Alain approves the public listing step.
