import type { IAuthenticate, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class GeniusReferralsApi implements ICredentialType {
    name: string;
    displayName: string;
    icon: {
        light: string;
        dark: string;
    };
    documentationUrl: string;
    authenticate: IAuthenticate;
    test: ICredentialTestRequest;
    properties: INodeProperties[];
}
