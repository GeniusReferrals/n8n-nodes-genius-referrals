import { config } from '@n8n/node-cli/eslint';

export default [
  ...config,
  {
    files: ['src/nodes/**/*.node.ts'],
    rules: {
      // The n8n rule maps dist paths back to root-level source files. This
      // package keeps source under src/ while publishing dist/, so the rule
      // cannot resolve the declared credential even though the package path is
      // valid after build.
      '@n8n/community-nodes/no-credential-reuse': 'off',
    },
  },
];
