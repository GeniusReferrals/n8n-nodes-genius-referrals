import type { IDataObject, IHttpRequestMethods, INode, INodeProperties } from 'n8n-workflow';
export type GeniusReferralsResource = 'accounts' | 'advocates' | 'bonuses' | 'campaigns' | 'redemptionRequests' | 'referrals' | 'reports' | 'utilities';
export type GeniusReferralsParameterName = 'accountSlug' | 'advocateToken' | 'bonusId' | 'bonusesRedemptionMethodSlug' | 'campaignSlug' | 'clientSlug' | 'currencyCode' | 'queryJson' | 'payloadJson' | 'redemptionRequestId' | 'referralId' | 'referralOriginSlug' | 'requestActionSlug' | 'requestStatusSlug' | 'traceId';
export interface GeniusReferralsNodeParameters {
    accountSlug?: string;
    advocateToken?: string;
    bonusId?: string;
    bonusesRedemptionMethodSlug?: string;
    campaignSlug?: string;
    clientSlug?: string;
    currencyCode?: string;
    operation: string;
    payloadJson?: IDataObject | string;
    queryJson?: IDataObject | string;
    redemptionRequestId?: string;
    referralId?: string;
    referralOriginSlug?: string;
    requestActionSlug?: string;
    requestStatusSlug?: string;
    resource: GeniusReferralsResource;
    traceId?: string;
}
export interface GeniusReferralsBuiltRequest {
    body?: IDataObject;
    endpoint: string;
    method: IHttpRequestMethods;
    qs?: IDataObject;
}
export declare const GENIUS_REFERRALS_RESOURCE_OPTIONS: Array<{
    name: string;
    value: GeniusReferralsResource;
}>;
export declare const GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE: Record<GeniusReferralsResource, Array<{
    description: string;
    name: string;
    value: string;
}>>;
export declare function buildGeniusReferralsRequestDefinition(parameters: GeniusReferralsNodeParameters, node?: INode): GeniusReferralsBuiltRequest;
export declare function createOperationProperties(): INodeProperties[];
export declare function getOperationsForResource(resource: GeniusReferralsResource): string[];
export declare function getOperationsWithBody(): string[];
export declare function getOperationsWithParameter(parameterName: GeniusReferralsParameterName): string[];
