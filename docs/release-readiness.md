# Release Readiness

## Objective

Track the remaining work needed before `n8n-nodes-genius-referrals` is published to npm and submitted for n8n community-node verification.

## Current candidate

- Package candidate: `n8n-nodes-genius-referrals@0.1.3`
- Purpose: prepare a fresh npm version for Creator Portal revalidation after
  the `0.1.2` candidate completed source, QA, Stage, Ledger, and merge-readiness
  gates.
- Publication status: not published by issue #33.
- Creator Portal status: not resubmitted by issue #33.
- Required next gates: Bolt developer proof, Sentinel `mbp-server:qa`,
  Sentinel `mbp-server:stage`, Ledger release-risk disposition, then Aegis
  release/publish approval orchestration.
- Controller invariant: `POST_PUBLISH_SCAN_AUDIT_REQUIRED`. Public
  `scan-community-package` validation is post-publish/manual Creator Portal
  audit evidence for `0.1.3`, not a pre-merge blocker for the unpublished
  candidate.

## Package checklist

- [x] Package name uses the `n8n-nodes-` community-node convention
- [x] `package.json` includes the `n8n` metadata block for credentials and nodes
- [x] Build output is generated into `dist/`
- [x] README documents install, credentials, supported operations, and examples
- [x] MIT license text is included in the repository
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm test`
- [x] Run `npm pack` and inspect the tarball contents
- [ ] Replace the placeholder lint script with a real lint configuration
- [ ] Validate installation from the tarball in a clean n8n instance

## n8n Creator Portal checklist

- [x] Community-node package structure is present
- [x] Credential form and node entrypoints are defined in the `n8n` package metadata
- [x] README is suitable for first-time users
- [ ] Capture install and credential screenshots from a clean n8n instance
- [ ] Confirm the final npm package version to submit for review
- [ ] Submit the package to the n8n Creator Portal after npm publication

## Explicit approval steps

These steps should not be performed without Alain approval:

1. Publish the package to npm under the approved maintainer/org account.
2. Submit the community node to the n8n Creator Portal or verification workflow.
3. Approve the final version number, release notes, and any public-facing listing copy.

Before npm publication, the ticket or approval packet must record the approved
package name, version, source commit, final release/workflow commit, package
SHA-256, prepared workflow run ID, prepared artifact ID, and the exact Alain
`[ProductionApproval]` comment ID.

After approved publication, the public n8n package validator or Creator Portal
audit record must include package name, version, registry tarball URL,
checksum or integrity, validator result, and follow-up owner.

## Known limitations

- The repo currently treats `lint` as a documented placeholder rather than a real static-analysis gate.
- Some entity-specific selectors are still manual inputs in the node UI, including advocate token, campaign slug, bonus ID, trace ID, redemption request ID, and referral ID.
- Publish readiness depends on validating the packed tarball in a clean n8n instance before public release.
