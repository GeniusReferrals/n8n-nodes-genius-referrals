import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GeniusReferralsApi implements ICredentialType {
  name = 'geniusReferralsApi';

  displayName = 'Genius Referrals API';

  documentationUrl = 'https://support.geniusreferrals.com';

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://www.geniusreferrals.com/api/2.0',
      required: true,
      description: 'Base URL for the Genius Referrals API.',
    },
    {
      displayName: 'API Token',
      name: 'apiToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description: 'Maps to the X-Auth-Token header expected by the API.',
    },
  ];
}
