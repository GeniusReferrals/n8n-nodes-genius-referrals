import type { IHttpRequestMethods, IHttpRequestOptions, INode, JsonObject, NodeApiError, NodeApiErrorOptions } from 'n8n-workflow';
export declare class GeniusReferralsApiError extends Error {
    name: string;
    readonly statusCode?: number;
    readonly endpoint: string;
    readonly method: IHttpRequestMethods;
    readonly apiCode?: string;
    readonly details?: unknown;
    readonly responseBody?: unknown;
    constructor(options: {
        message: string;
        endpoint: string;
        method: IHttpRequestMethods;
        statusCode?: number;
        apiCode?: string;
        details?: unknown;
        responseBody?: unknown;
    });
}
export interface NodeApiErrorConstructor<T extends Error = NodeApiError> {
    new (node: INode, errorResponse: JsonObject, options?: NodeApiErrorOptions): T;
}
export declare function toGeniusReferralsApiError(error: unknown, requestOptions: IHttpRequestOptions): GeniusReferralsApiError;
export declare function toGeniusReferralsNodeApiErrorResponse(error: unknown, requestOptions: IHttpRequestOptions): JsonObject;
export declare function createGeniusReferralsNodeApiError<T extends Error = NodeApiError>(nodeApiErrorCtor: NodeApiErrorConstructor<T>, node: INode, error: unknown, requestOptions: IHttpRequestOptions, options?: NodeApiErrorOptions): T;
