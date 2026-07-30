# Release SOP

## Scope

This SOP covers the production release path for `n8n-nodes-genius-referrals`
version `0.1.0`. It prepares npm publication and post-publication verification
without publishing from a local machine, Discord, a Project field, or any other
non-GitHub-Actions surface.

Approved release identity:

| Field | Value |
| --- | --- |
| Package | `n8n-nodes-genius-referrals` |
| Version | `0.1.0` |
| Commit | `54d7cb816186d849acf2056bc35d081424f17565` |
| Package SHA-256 | `71128f5b942cd67777c29576a87a0160e67801ed0ee21f937d904d59d36a95e5` |
| Approval record | <https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/1#issuecomment-5132426865> |
| Current release blocker | <https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/1#issuecomment-5132427933> |

Any mismatch in package name, version, commit, or checksum fails closed.

## Required GitHub Environment

Create a GitHub Environment named `npm-production` before the first real
publication.

Required environment controls:

- Require reviewer approval from the authorized production approver.
- Keep deployment branches restricted to the approved release branch or default
  branch used for the release workflow.
- Store the temporary npm credential only as the environment secret `NPM_TOKEN`.

The npm credential must never be written to repository files, GitHub comments,
Project fields, Discord, prompts, command arguments, or OpenClaw credential
storage.

Temporary first-publication credential:

- Secret name: `NPM_TOKEN`
- Permission: publish permission sufficient for first publication of the
  unscoped `n8n-nodes-genius-referrals` package
- Scope: use the narrowest token npm allows for creating and publishing this
  first version
- Lifetime: 24 hours maximum, or revoke immediately after the first successful
  publication, whichever comes first

## Dry-Run Validation

Dry-run validation uses no npm credential.

Run the workflow `.github/workflows/publish-n8n-node.yml` with
`publish_mode=dry-run`, or run locally:

```bash
node scripts/verify-approved-release.cjs
```

The verifier checks out the exact approved commit in a temporary clone, then
runs:

1. `npm ci --include=dev`
2. `npm run build`
3. `npm run lint`
4. `npm test`
5. `npm pack`
6. `npm publish --dry-run --access public <tarball>`
7. SHA-256 comparison against the approved package checksum

The local runtime may have `NODE_ENV=production`; the verifier uses
`npm ci --include=dev` so TypeScript and other build dependencies are installed
deterministically.

## First Publication

Use only GitHub Actions for real publication:

1. Confirm the approval record is still accepted and the blocker issue has been
   resolved.
2. Confirm `npm-production` exists and has the required reviewer protection.
3. Add `NPM_TOKEN` to the `npm-production` environment.
4. Run `.github/workflows/publish-n8n-node.yml` with `publish_mode=real`.
5. Review and approve the protected environment prompt.

The workflow first rebuilds and verifies the package from the approved commit.
The protected publish job can start only after validation passes.

The real publish step runs:

```bash
npm publish <verified-tarball> --access public --provenance
```

The workflow has `id-token: write` permission so npm provenance can be requested
from the GitHub-hosted runner. The token is passed through `NODE_AUTH_TOKEN`
from `secrets.NPM_TOKEN`; the value is never echoed.

## Idempotency

Before any real publish attempt, the workflow checks the npm registry for
`n8n-nodes-genius-referrals@0.1.0`.

If the version exists and the downloaded registry tarball has the approved
SHA-256, the workflow records success and skips `npm publish`.

If the version exists with a different checksum, the workflow fails closed and
does not publish.

If the package or version is missing, the workflow proceeds to the protected
publish step.

## Post-Release Verification

After publication, run:

```bash
node scripts/verify-published-package.cjs
```

The verifier checks:

- package exists on the npm registry
- version is exactly `0.1.0`
- registry tarball can be downloaded
- downloaded tarball SHA-256 matches the approved checksum
- registry `dist.integrity`, `dist.shasum`, and attestation metadata are
  recorded when npm exposes them

The workflow summary must record:

- workflow run URL
- approved commit
- package version
- package SHA-256
- registry verification result
- provenance/attestation evidence where available

## Rollback And Deprecation Limits

npm publication is append-only for normal release operations. Do not depend on
unpublish as rollback.

If a bad package is published:

1. Stop further promotion and n8n Creator Portal submission.
2. Deprecate the bad version with clear guidance if needed.
3. Publish a corrected patch version only after a new issue, approval record,
   checksum, and validation run exist.
4. Record impact, workflow run, package version, checksum, and corrective action
   in the release issue.

## n8n Creator Portal

Do not submit to the n8n Creator Portal in this implementation pass. Submission
can happen only after npm publication and post-release verification are complete
and Alain approves the public listing step.
