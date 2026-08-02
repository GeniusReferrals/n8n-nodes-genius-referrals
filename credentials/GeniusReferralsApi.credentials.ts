import type { IAuthenticate, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class GeniusReferralsApi implements ICredentialType {
  name = 'geniusReferralsApi';

  displayName = 'Genius Referrals API';

  icon = {
    light: 'file:../icons/genius-referrals.svg',
    dark: 'file:../icons/genius-referrals-dark.png',
  };

  documentationUrl = 'https://api.geniusreferrals.com/doc';

  authenticate: IAuthenticate = {
    type: 'generic',
    properties: {
      headers: {
        'X-Auth-Token': '={{$credentials.apiToken}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      method: 'GET',
      url: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}/test-authentication',
    },
    rules: [
      {
        type: 'responseCode',
        properties: {
          value: 200,
          message: 'Authentication failed. Verify the API base URL and token.',
        },
      },
    ],
  };

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.geniusreferrals.com',
      required: true,
      description: 'Base URL for the Genius Referrals API. Use the dedicated API host without a trailing slash when possible.',
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
