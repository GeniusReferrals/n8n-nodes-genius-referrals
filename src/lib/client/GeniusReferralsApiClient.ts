import type {
  ICredentialDataDecryptedObject,
  IDataObject,
  IHttpRequestMethods,
  IHttpRequestOptions,
} from 'n8n-workflow';

import {
  GeniusReferralsApiError,
  toGeniusReferralsApiError,
} from '../errors/GeniusReferralsApiError';

const DEFAULT_BASE_URL = 'https://api.geniusreferrals.com';

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
    requestWithAuthentication: GeniusReferralsAuthenticatedRequestExecutor;
  };
}

export interface GeniusReferralsApiClient {
  credentials: GeniusReferralsApiCredentials;
  request<T>(options: GeniusReferralsRequestOptions): Promise<T>;
}

export type GeniusReferralsRequestExecutor = (requestOptions: IHttpRequestOptions) => Promise<unknown>;
export type GeniusReferralsAuthenticatedRequestExecutor = (
  credentialType: string,
  requestOptions: IHttpRequestOptions,
) => Promise<unknown>;
export const GENIUS_REFERRALS_API_CREDENTIAL_TYPE = 'geniusReferralsApi';

export function buildGeniusReferralsRequestOptions(
  options: GeniusReferralsRequestOptions,
): IHttpRequestOptions {
  const method = options.method ?? 'GET';
  const headers: IDataObject = {
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

export async function grApiRequest<T>(
  request: GeniusReferralsRequestExecutor,
  options: GeniusReferralsRequestOptions,
): Promise<T> {
  const requestOptions = buildGeniusReferralsRequestOptions(options);

  try {
    return (await request(requestOptions)) as T;
  } catch (error) {
    throw toGeniusReferralsApiError(error, requestOptions);
  }
}

export async function grApiRequestWithAuthentication<T>(
  requestWithAuthentication: GeniusReferralsAuthenticatedRequestExecutor,
  options: GeniusReferralsRequestOptions,
  credentialType = GENIUS_REFERRALS_API_CREDENTIAL_TYPE,
): Promise<T> {
  const requestOptions = buildGeniusReferralsRequestOptions(options);

  try {
    return (await requestWithAuthentication(credentialType, requestOptions)) as T;
  } catch (error) {
    throw toGeniusReferralsApiError(error, requestOptions);
  }
}

export function isGeniusReferralsApiError(error: unknown): error is GeniusReferralsApiError {
  return error instanceof GeniusReferralsApiError;
}

export async function getGeniusReferralsApiCredentials(
  context: GeniusReferralsApiRequestContext,
  credentialType = GENIUS_REFERRALS_API_CREDENTIAL_TYPE,
): Promise<GeniusReferralsApiCredentials> {
  const credentials = await context.getCredentials(credentialType);

  return {
    ...credentials,
    baseUrl: resolveBaseUrl(credentials.baseUrl),
  } as GeniusReferralsApiCredentials;
}

export async function createGeniusReferralsApiClient(
  context: GeniusReferralsApiRequestContext,
  credentialType = GENIUS_REFERRALS_API_CREDENTIAL_TYPE,
): Promise<GeniusReferralsApiClient> {
  const credentials = await getGeniusReferralsApiCredentials(context, credentialType);

  return {
    credentials,
    request: async <T>(options: GeniusReferralsRequestOptions) =>
      grApiRequestWithAuthentication<T>(
        context.helpers.requestWithAuthentication.bind(context.helpers),
        {
          ...options,
          baseUrl: options.baseUrl ?? credentials.baseUrl,
        },
        credentialType,
      ),
  };
}

function joinBaseUrlAndEndpoint(baseUrl: string, endpoint: string): string {
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, '');
  const trimmedEndpoint = endpoint.replace(/^\/+/, '');

  return trimmedEndpoint === '' ? trimmedBaseUrl : `${trimmedBaseUrl}/${trimmedEndpoint}`;
}

function resolveBaseUrl(baseUrl: unknown): string {
  if (typeof baseUrl !== 'string') {
    return DEFAULT_BASE_URL;
  }

  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

  return trimmedBaseUrl === '' ? DEFAULT_BASE_URL : trimmedBaseUrl;
}
