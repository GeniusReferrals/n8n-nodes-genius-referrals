import type { ICredentialDataDecryptedObject, IDataObject, IHttpRequestMethods, IHttpRequestOptions, INode, NodeApiErrorOptions } from 'n8n-workflow';
import { GeniusReferralsApiError, NodeApiErrorConstructor } from '../errors/GeniusReferralsApiError';
export interface GeniusReferralsRequestOptions {
    baseUrl?: string;
    body?: IDataObject | IDataObject[];
    endpoint: string;
    headers?: IDataObject;
    ignoreHttpStatusErrors?: boolean;
    method?: IHttpRequestMethods;
    qs?: IDataObject;
    returnFullResponse?: boolean;
}
export interface GeniusReferralsApiCredentials extends ICredentialDataDecryptedObject {
    apiToken: string;
    baseUrl?: string;
}
export interface GeniusReferralsApiRequestContext {
    getCredentials(name: string): Promise<ICredentialDataDecryptedObject>;
    helpers: {
        httpRequestWithAuthentication: GeniusReferralsAuthenticatedRequestExecutor;
    };
}
export interface GeniusReferralsApiClient {
    credentials: GeniusReferralsApiCredentials;
    request<T>(options: GeniusReferralsRequestOptions): Promise<T>;
}
export type GeniusReferralsRequestExecutor = (requestOptions: IHttpRequestOptions) => Promise<unknown>;
export type GeniusReferralsAuthenticatedRequestExecutor = (credentialType: string, requestOptions: IHttpRequestOptions) => Promise<unknown>;
export interface GeniusReferralsNodeApiErrorContext<T extends Error = Error> {
    node: INode;
    nodeApiErrorCtor: NodeApiErrorConstructor<T>;
    nodeApiErrorOptions?: NodeApiErrorOptions;
}
export declare const GENIUS_REFERRALS_API_CREDENTIAL_TYPE = "geniusReferralsApi";
export declare function buildGeniusReferralsRequestOptions(options: GeniusReferralsRequestOptions): IHttpRequestOptions;
export declare function grApiRequest<T>(request: GeniusReferralsRequestExecutor, options: GeniusReferralsRequestOptions): Promise<T>;
export declare function grApiRequestAsNodeApiError<T, TError extends Error = Error>(request: GeniusReferralsRequestExecutor, options: GeniusReferralsRequestOptions, errorContext: GeniusReferralsNodeApiErrorContext<TError>): Promise<T>;
export declare function grApiRequestWithAuthentication<T>(requestWithAuthentication: GeniusReferralsAuthenticatedRequestExecutor, options: GeniusReferralsRequestOptions, credentialType?: string): Promise<T>;
export declare function grApiRequestWithAuthenticationAsNodeApiError<T, TError extends Error = Error>(requestWithAuthentication: GeniusReferralsAuthenticatedRequestExecutor, options: GeniusReferralsRequestOptions, errorContext: GeniusReferralsNodeApiErrorContext<TError>, credentialType?: string): Promise<T>;
export declare function isGeniusReferralsApiError(error: unknown): error is GeniusReferralsApiError;
export declare function getGeniusReferralsApiCredentials(context: GeniusReferralsApiRequestContext, credentialType?: string): Promise<GeniusReferralsApiCredentials>;
export declare function createGeniusReferralsApiClient(context: GeniusReferralsApiRequestContext, credentialType?: string): Promise<GeniusReferralsApiClient>;
