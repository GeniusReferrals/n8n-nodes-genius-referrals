# n8n-nodes-genius-referrals

Community node scaffold for the Genius Referrals API.

## Current status

This repository now contains the initial issue `#2` baseline:

- package metadata for an n8n community node
- a placeholder `GeniusReferralsApi` credential
- a placeholder `GeniusReferrals` node definition
- TypeScript build output via `npm run build`

## Local development

```bash
npm install
npm run build
npm run lint
```

## Notes

- The current `lint` script is a documented placeholder until the repo adopts a real linting standard.
- The API client, authentication test call, and resource operations are tracked in follow-up issues `#3` and `#4`.
