"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENIUS_REFERRALS_API_CREDENTIAL_TYPE = void 0;
exports.buildGeniusReferralsRequestOptions = buildGeniusReferralsRequestOptions;
exports.grApiRequest = grApiRequest;
exports.grApiRequestAsNodeApiError = grApiRequestAsNodeApiError;
exports.grApiRequestWithAuthentication = grApiRequestWithAuthentication;
exports.grApiRequestWithAuthenticationAsNodeApiError = grApiRequestWithAuthenticationAsNodeApiError;
exports.isGeniusReferralsApiError = isGeniusReferralsApiError;
exports.getGeniusReferralsApiCredentials = getGeniusReferralsApiCredentials;
exports.createGeniusReferralsApiClient = createGeniusReferralsApiClient;
const GeniusReferralsApiError_1 = require("../errors/GeniusReferralsApiError");
const DEFAULT_BASE_URL = 'https://api.geniusreferrals.com';
exports.GENIUS_REFERRALS_API_CREDENTIAL_TYPE = 'geniusReferralsApi';
function buildGeniusReferralsRequestOptions(options) {
    const method = options.method ?? 'GET';
    const headers = {
        Accept: 'application/json',
        ...(options.headers ?? {}),
    };
    if (options.body !== undefined && headers['Content-Type'] === undefined) {
        headers['Content-Type'] = 'application/json';
    }
    return {
        body: options.body,
        headers,
        ignoreHttpStatusErrors: options.ignoreHttpStatusErrors,
        json: true,
        method,
        qs: options.qs,
        returnFullResponse: options.returnFullResponse,
        url: joinBaseUrlAndEndpoint(options.baseUrl ?? DEFAULT_BASE_URL, options.endpoint),
    };
}
async function grApiRequest(request, options) {
    const requestOptions = buildGeniusReferralsRequestOptions(options);
    try {
        return (await request(requestOptions));
    }
    catch (error) {
        throw (0, GeniusReferralsApiError_1.toGeniusReferralsApiError)(error, requestOptions);
    }
}
async function grApiRequestAsNodeApiError(request, options, errorContext) {
    const requestOptions = buildGeniusReferralsRequestOptions(options);
    try {
        return (await request(requestOptions));
    }
    catch (error) {
        throw (0, GeniusReferralsApiError_1.createGeniusReferralsNodeApiError)(errorContext.nodeApiErrorCtor, errorContext.node, error, requestOptions, errorContext.nodeApiErrorOptions);
    }
}
async function grApiRequestWithAuthentication(requestWithAuthentication, options, credentialType = exports.GENIUS_REFERRALS_API_CREDENTIAL_TYPE) {
    const requestOptions = buildGeniusReferralsRequestOptions(options);
    try {
        return (await requestWithAuthentication(credentialType, requestOptions));
    }
    catch (error) {
        throw (0, GeniusReferralsApiError_1.toGeniusReferralsApiError)(error, requestOptions);
    }
}
async function grApiRequestWithAuthenticationAsNodeApiError(requestWithAuthentication, options, errorContext, credentialType = exports.GENIUS_REFERRALS_API_CREDENTIAL_TYPE) {
    const requestOptions = buildGeniusReferralsRequestOptions(options);
    try {
        return (await requestWithAuthentication(credentialType, requestOptions));
    }
    catch (error) {
        throw (0, GeniusReferralsApiError_1.createGeniusReferralsNodeApiError)(errorContext.nodeApiErrorCtor, errorContext.node, error, requestOptions, errorContext.nodeApiErrorOptions);
    }
}
function isGeniusReferralsApiError(error) {
    return error instanceof GeniusReferralsApiError_1.GeniusReferralsApiError;
}
async function getGeniusReferralsApiCredentials(context, credentialType = exports.GENIUS_REFERRALS_API_CREDENTIAL_TYPE) {
    const credentials = await context.getCredentials(credentialType);
    return {
        ...credentials,
        baseUrl: resolveBaseUrl(credentials.baseUrl),
    };
}
async function createGeniusReferralsApiClient(context, credentialType = exports.GENIUS_REFERRALS_API_CREDENTIAL_TYPE) {
    const credentials = await getGeniusReferralsApiCredentials(context, credentialType);
    return {
        credentials,
        request: async (options) => grApiRequestWithAuthentication((credentialType, requestOptions) => context.helpers.httpRequestWithAuthentication.call(context, credentialType, requestOptions), {
            ...options,
            baseUrl: options.baseUrl ?? credentials.baseUrl,
        }, credentialType),
    };
}
function joinBaseUrlAndEndpoint(baseUrl, endpoint) {
    const trimmedBaseUrl = baseUrl.replace(/\/+$/, '');
    const trimmedEndpoint = endpoint.replace(/^\/+/, '');
    return trimmedEndpoint === '' ? trimmedBaseUrl : `${trimmedBaseUrl}/${trimmedEndpoint}`;
}
function resolveBaseUrl(baseUrl) {
    if (typeof baseUrl !== 'string') {
        return DEFAULT_BASE_URL;
    }
    const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
    return trimmedBaseUrl === '' ? DEFAULT_BASE_URL : trimmedBaseUrl;
}
