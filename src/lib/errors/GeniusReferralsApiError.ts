import type { IDataObject, IHttpRequestMethods, IHttpRequestOptions } from 'n8n-workflow';

const DEFAULT_ERROR_MESSAGE = 'Genius Referrals API request failed.';

export class GeniusReferralsApiError extends Error {
  name = 'GeniusReferralsApiError';

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
  }) {
    super(options.message);
    this.statusCode = options.statusCode;
    this.endpoint = options.endpoint;
    this.method = options.method;
    this.apiCode = options.apiCode;
    this.details = options.details;
    this.responseBody = options.responseBody;
  }
}

type ErrorLike = {
  body?: unknown;
  error?: unknown;
  message?: string;
  response?: {
    body?: unknown;
    data?: unknown;
    status?: number;
    statusCode?: number;
  };
  statusCode?: number;
};

export function toGeniusReferralsApiError(
  error: unknown,
  requestOptions: IHttpRequestOptions,
): GeniusReferralsApiError {
  if (error instanceof GeniusReferralsApiError) {
    return error;
  }

  const errorLike = (error ?? {}) as ErrorLike;
  const responseBody =
    errorLike.response?.data ?? errorLike.response?.body ?? errorLike.body ?? errorLike.error;
  const parsedBody = asDataObject(responseBody);
  const statusCode =
    errorLike.response?.statusCode ??
    errorLike.response?.status ??
    errorLike.statusCode;
  const apiMessage =
    pickString(parsedBody?.message) ??
    pickString(parsedBody?.error) ??
    pickString(parsedBody?.description);
  const apiCode = pickString(parsedBody?.code) ?? pickString(parsedBody?.errorCode);
  const details = parsedBody?.details ?? parsedBody?.errors;
  const fallbackMessage =
    errorLike.message ??
    (statusCode ? `Genius Referrals API request failed with status ${statusCode}.` : DEFAULT_ERROR_MESSAGE);

  return new GeniusReferralsApiError({
    message: apiMessage ?? fallbackMessage,
    endpoint: requestOptions.url,
    method: requestOptions.method ?? 'GET',
    statusCode,
    apiCode,
    details,
    responseBody,
  });
}

function asDataObject(value: unknown): IDataObject | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as IDataObject;
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}
