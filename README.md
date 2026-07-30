# n8n-nodes-genius-referrals

`n8n-nodes-genius-referrals` is an n8n community node for the Genius Referrals API. It currently exposes 8 resource families and 52 operations for account, advocate, bonus, campaign, referral, redemption, report, and utility workflows.

## Supported coverage

| Resource | Example operations |
| --- | --- |
| Accounts | Get all accounts, get an account |
| Advocates | Get advocates, create advocate, patch advocate, get share links |
| Bonuses | Get bonuses, create bonus, patch bonus, bonus checkup, bonus traces |
| Campaigns | Get campaigns, get a campaign |
| Redemption Requests | Get requests, create request, patch request, redeem request |
| Referrals | Get referrals, create referral, replace referral, delete referral |
| Reports | Revenue, top advocates, daily participation, origin summaries, 1099 tax |
| Utilities | Test authentication, currencies, payment methods, referral origins, redemption statuses |

## Installation

### Self-hosted n8n

1. Install the package in the same environment where n8n runs:

   ```bash
   npm install n8n-nodes-genius-referrals
   ```

2. Restart n8n so it loads the new community node package.
3. Open the editor and search for `Genius Referrals`.

### Community Nodes UI

When the package is published to npm, install it from `Settings -> Community Nodes -> Install` with:

```text
n8n-nodes-genius-referrals
```

### Pre-publish validation

Before npm publication, validate the package with:

```bash
npm install
npm run build
npm run lint
npm test
npm pack
```

Use the generated tarball in a test n8n instance to confirm the node loads and the credential form appears as expected.

## Credentials

Create a `Genius Referrals API` credential in n8n with:

- `API Token`: your Genius Referrals API token. This is sent as the `X-Auth-Token` header.
- `Base URL`: defaults to `https://api.geniusreferrals.com`

The node also includes `Utilities -> Test authentication` so you can verify the credential before running other operations.

## Operation behavior

- Account slugs load dynamically from the API token where the API supports it.
- Utility-backed selectors such as currencies, referral origins, and redemption statuses load dynamically.
- POST and PUT operations automatically wrap payloads when the Genius Referrals API expects nested roots such as `advocate`, `bonus`, `referral`, or `redemption_request`.
- PATCH operations preserve the flat payload shape expected by the API.
- Report operations merge `Client Slug` into the outgoing query string as `client_slug`.
- Some entity-specific identifiers remain manual inputs in this safe slice, including advocate token, campaign slug, bonus ID, trace ID, redemption request ID, and referral ID.

## Example usage

### 1. Verify the credential

- Resource: `Utilities`
- Operation: `Test authentication`

This is the fastest sanity check after adding the API token.

### 2. List advocates for an account

- Resource: `Advocates`
- Operation: `Get advocates`
- Account Slug: choose one of the accounts loaded from the credential
- Query JSON example:

```json
{
  "page": 1,
  "per_page": 25
}
```

### 3. Create an advocate

- Resource: `Advocates`
- Operation: `Create an advocate`
- Account Slug: select the target account
- Payload JSON example:

```json
{
  "firstname": "Ada",
  "lastname": "Lovelace",
  "email": "ada@example.com"
}
```

The node wraps this automatically as:

```json
{
  "advocate": {
    "firstname": "Ada",
    "lastname": "Lovelace",
    "email": "ada@example.com"
  }
}
```

### 4. Pull a revenue report

- Resource: `Reports`
- Operation: `Get revenue report`
- Client Slug: select the client/account slug
- Query JSON example:

```json
{
  "from": "2026-01-01",
  "to": "2026-01-31"
}
```

The node adds `client_slug` automatically.

## Local development

```bash
npm install
npm run build
npm run lint
npm test
```

## Release readiness

The detailed release checklist lives in [docs/release-readiness.md](docs/release-readiness.md).

Current release notes:

- Package naming and `n8n` metadata are in place for a community node package.
- TypeScript build output is generated into `dist/`.
- Repo tests cover request wrapping, query requirements, and API client error mapping.
- `lint` is still a placeholder script and should be replaced by a real lint configuration before public release.
- Final npm publish and n8n Creator Portal submission require Alain approval.
