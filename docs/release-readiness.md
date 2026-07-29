# Release Readiness

## Objective

Track the remaining work needed before `n8n-nodes-genius-referrals` is published to npm and submitted for n8n community-node verification.

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

## Known limitations

- The repo currently treats `lint` as a documented placeholder rather than a real static-analysis gate.
- Some entity-specific selectors are still manual inputs in the node UI, including advocate token, campaign slug, bonus ID, trace ID, redemption request ID, and referral ID.
- Publish readiness depends on validating the packed tarball in a clean n8n instance before public release.
