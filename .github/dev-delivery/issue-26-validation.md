# Issue 26 Developer Validation Evidence

Session key: `agent:bolt:dev-delivery:geniusreferrals-n8n-nodes-genius-referrals:issue-26`

## Validation Target

- Issue: https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/issues/26
- Existing merged PR: https://github.com/GeniusReferrals/n8n-nodes-genius-referrals/pull/25
- Merge commit: `151f7457989e5782a672c40a2730dfc5fdda982a`
- PR source HEAD: `a7612ac583d7db01dae8962fa5ecc075fcebb824`
- Manifest source commit: `8b205bf5979869c19a5687201a72ee54ba008b74`
- Package candidate: `n8n-nodes-genius-referrals@0.1.2`

## PR 25 Changed Files

- `credentials/GeniusReferralsApi.credentials.ts`
- `dist/credentials/GeniusReferralsApi.credentials.js`
- `dist/nodes/GeniusReferrals/GeniusReferrals.node.js`
- `dist/nodes/GeniusReferrals/GeniusReferrals.operation.js`
- `index.ts`
- `lib/client/GeniusReferralsApiClient.ts`
- `lib/errors/GeniusReferralsApiError.ts`
- `nodes/GeniusReferrals/GeniusReferrals.node.ts`
- `nodes/GeniusReferrals/GeniusReferrals.operation.ts`
- `package-lock.json`
- `package.json`
- `release-manifest.json`
- `test/package-icons.test.cjs`
- `tsconfig.json`
- `types/n8n-core.d.ts`
- `types/n8n-workflow.d.ts`

## Local Regression Results

- `npm ci --include=dev`: PASS; installed 556 packages; npm audit reported 6 moderate dependency findings.
- `npm run build`: PASS; TypeScript build completed.
- `npm run lint`: PASS; `n8n-node lint` completed.
- `npm test`: PASS; 35/35 tests passed across 4 test files.
- `npm run release:prepare`: PASS; cloned and validated manifest source commit, ran build/lint/tests, packed artifact, ran npm publish dry-run, and verified package checksums.
- Creator Portal layout smoke check: PASS; top-level `credentials/`, `nodes/`, `lib/`, `types/`, and `index.ts` source paths exist while `package.json` keeps n8n runtime metadata pointed at `dist/credentials/GeniusReferralsApi.credentials.js` and `dist/nodes/GeniusReferrals/GeniusReferrals.node.js`.

## Artifact Identity

- Prepared artifact SHA-256: `e13af5a295a3dbc5e45ef9125d6ff590ec7a4ccdb388d49333cd7860add487b3`
- Prepared artifact SHA-512: `sha512-wsTsTv7d/4+tjTQFClWxkXuFWkr9pRrdIIE0I4Kq/e++6LKDG6yvMG7rBdU+26gyvy5nVwRra+CX6epUHt2cCw==`
- The evidence file is outside the package `files` allowlist, so it does not change the 0.1.2 package candidate contents.

## Known Limitations

- GitHub Project item field inspection could not be completed from this runtime because the available GitHub token has `repo` and `workflow` scopes but lacks `read:project`.
- This is Bolt developer validation only. Sentinel QA, mbp-server Stage certification, Ledger release-risk disposition, and Aegis release approval packet remain pending.
- No npm publish, Creator Portal resubmission, deployment, or production-impacting action was performed.

## Next Handoff

Sentinel should independently validate the exact PR/SHA scope on `mbp-server:qa`, then hand off to mbp-server Stage certification for the exact SHA/artifact before Ledger and Aegis proceed.
