# Creator Portal Demo Workflow 0.1.3

## Objective

Prepare a clean, repeatable n8n demo workflow for the Creator Portal video
review of `n8n-nodes-genius-referrals@0.1.3`.

## Package Proof

- Package: `n8n-nodes-genius-referrals`
- Version: `0.1.3`
- Install source: npm registry, not a local build
- Install command for the clean n8n instance:

  ```bash
  npm install n8n-nodes-genius-referrals@0.1.3
  ```

## Workflow Artifact

- Importable workflow: `docs/demo-workflows/creator-portal-demo-0.1.3.json`
- Workflow name: `Genius Referrals Creator Portal Demo 0.1.3`
- Workflow state: inactive
- Credential references: placeholder-only `Genius Referrals API - Demo`
- Node type used by the workflow: `n8n-nodes-genius-referrals.geniusReferrals`

## Recording Path

Target runtime: 3 to 4 minutes. Hard stop: 5 minutes.

1. Open a clean n8n instance.
2. Install community node package `n8n-nodes-genius-referrals@0.1.3`
   from npm.
3. Restart or reload n8n if the instance requires it.
4. Create a new workflow named
   `Genius Referrals Creator Portal Demo 0.1.3`.
5. Add the `Genius Referrals` node, or import
   `docs/demo-workflows/creator-portal-demo-0.1.3.json`.
6. Create `Genius Referrals API - Demo` credentials:
   - Base URL: `https://api.geniusreferrals.com`
   - API Token: paste off-screen or with the password field masked.
7. Run the built-in credential test and show PASS without exposing the token.
8. Run these nodes in order:
   - `Utilities -> Test Authentication`
   - `Accounts -> Get All Accounts`
   - `Utilities -> Get Currencies`
   - `Advocates -> Get Advocates` with `Query JSON` set to
     `{"page":1,"per_page":5}` after selecting a safe testing account slug.
   - `Reports -> Get Revenue Report` with `Query JSON` set to
     `{"from":"2026-01-01","to":"2026-01-31"}` after selecting a safe
     testing client/account slug.
9. If n8n shows AI tool support for the node, briefly show that
   `Genius Referrals` is usable as a tool. Do not build a full AI agent flow
   unless the rehearsal still fits under 5 minutes.

## Safe Credential And Data Handling

- Do not paste, display, narrate, export, or record the API token.
- Do not commit n8n credential exports.
- Select the credential in n8n after import. Leave workflow JSON placeholders
  untouched in git.
- Use Alain-approved testing credentials only through the n8n credential form.
- Use a safe testing account/client slug selected from n8n's credential-backed
  dropdown.
- Prefer the read-only actions in this runbook for the recording.
- Do not run delete, patch, force-create, redeem, or production-impacting
  operations in the video.
- If a create action is required later, use only a dedicated QA/demo account
  and sanitized sample contact data such as
  `creator-demo+YYYYMMDDHHMM@geniusreferrals.example`.
- Keep response panes away from customer-sensitive rows during recording.

## Known Limitations

- This repository artifact prepares the workflow and recording script. It does
  not upload anything to the Creator Portal.
- Final rehearsal still needs a clean n8n GUI instance with the npm package
  installed from the public registry.
- The account and client slug placeholders must be replaced during rehearsal
  with non-sensitive testing values.
