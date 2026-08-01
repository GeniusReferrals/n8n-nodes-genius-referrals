"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeniusReferralsApi = void 0;
class GeniusReferralsApi {
    constructor() {
        this.name = 'geniusReferralsApi';
        this.displayName = 'Genius Referrals API';
        this.icon = {
            light: 'file:../../icons/genius-referrals.svg',
            dark: 'file:../../icons/genius-referrals-dark.png',
        };
        this.documentationUrl = 'https://api.geniusreferrals.com/doc';
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    'X-Auth-Token': '={{$credentials.apiToken}}',
                },
            },
        };
        this.test = {
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
        this.properties = [
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
}
exports.GeniusReferralsApi = GeniusReferralsApi;
