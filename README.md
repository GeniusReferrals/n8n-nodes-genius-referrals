# n8n-nodes-genius-referrals

Community node scaffold for the Genius Referrals API.

## Current status

This repository now contains the initial issue `#2` baseline:

- package metadata for an n8n community node
- a `GeniusReferralsApi` credential with `X-Auth-Token` authentication and built-in auth test
- shared request and API error helpers for future node operations
- an n8n-aware API client factory that binds credential lookup and authenticated requests
- a placeholder `GeniusReferrals` node definition
- TypeScript build output and unit coverage for the issue `#3` foundation slice

## Local development

```bash
npm install
npm run build
npm run lint
npm test
```

## Notes

- The current `lint` script is a documented placeholder until the repo adopts a real linting standard.
- Resource operations are tracked in follow-up issue `#4`.
