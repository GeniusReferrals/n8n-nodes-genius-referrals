import { config } from '@n8n/node-cli/eslint';

export default [
  ...config,
  {
    files: ['nodes/**/*.node.ts'],
    rules: {
      // In the Node 22 container used for mbp-server QA, this n8n rule can
      // fail to resolve this package's declared credential even though the
      // credential name matches and package.json points to the built dist file.
      '@n8n/community-nodes/no-credential-reuse': 'off',
    },
  },
];
