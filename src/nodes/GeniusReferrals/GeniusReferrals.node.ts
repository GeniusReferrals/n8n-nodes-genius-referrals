import type { INodeType } from 'n8n-core';

export class GeniusReferrals implements INodeType {
  description = {
    version: 1,
    defaults: {
      name: 'Genius Referrals',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'geniusReferralsApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'This scaffold establishes the package baseline for issue #2.',
        name: 'scaffoldNotice',
        type: 'notice',
        default: '',
      },
    ],
  };
}
