import type {
  GenericValue,
  IDataObject,
  IHttpRequestMethods,
  IHttpRequestOptions,
  INode,
  JsonObject,
  NodeApiError,
  NodeApiErrorOptions,
} from 'n8n-workflow';

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

export interface NodeApiErrorConstructor<T extends Error = NodeApiError> {
  new (node: INode, errorResponse: JsonObject, options?: NodeApiErrorOptions): T;
}

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

export function toGeniusReferralsNodeApiErrorResponse(
  error: unknown,
  requestOptions: IHttpRequestOptions,
): JsonObject {
  const apiError = toGeniusReferralsApiError(error, requestOptions);
  const validationSummary = summarizeDetails(apiError.details);
  const description = [
    apiError.apiCode ? `API code: ${apiError.apiCode}` : undefined,
    validationSummary ? `Validation details: ${validationSummary}` : undefined,
    `Request: ${apiError.method} ${apiError.endpoint}`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' | ');

  const responseData: IDataObject = {
    code: apiError.apiCode,
    details: toGenericValue(apiError.details),
    endpoint: apiError.endpoint,
    message: apiError.message,
    method: apiError.method,
    responseBody: toGenericValue(apiError.responseBody),
    statusCode: apiError.statusCode,
  };

  if (description !== '') {
    responseData.description = description;
  }

  return {
    code: apiError.apiCode,
    details: toGenericValue(apiError.details),
    endpoint: apiError.endpoint,
    httpCode: apiError.statusCode !== undefined ? String(apiError.statusCode) : undefined,
    message: apiError.message,
    method: apiError.method,
    response: {
      body: responseData,
      data: responseData,
      statusCode: apiError.statusCode,
    },
    statusCode: apiError.statusCode,
    ...(description !== '' ? { description } : {}),
  };
}

export function createGeniusReferralsNodeApiError<T extends Error = NodeApiError>(
  nodeApiErrorCtor: NodeApiErrorConstructor<T>,
  node: INode,
  error: unknown,
  requestOptions: IHttpRequestOptions,
  options: NodeApiErrorOptions = {},
): T {
  const errorResponse = toGeniusReferralsNodeApiErrorResponse(error, requestOptions);

  return new nodeApiErrorCtor(node, errorResponse, {
    ...options,
    description: options.description ?? pickString(errorResponse.description),
    httpCode: options.httpCode ?? pickString(errorResponse.httpCode),
    message: options.message ?? pickString(errorResponse.message),
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

function summarizeDetails(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue === '' ? undefined : trimmedValue;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => summarizeDetails(entry))
      .filter((entry): entry is string => Boolean(entry));

    return truncate(parts.join('; '));
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, entryValue]) => {
      const summary = summarizeDetails(entryValue);
      return summary ? `${key}: ${summary}` : undefined;
    })
    .filter((entry): entry is string => Boolean(entry));

  return truncate(entries.join('; '));
}

function toGenericValue(value: unknown): GenericValue {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toGenericValue(entry));
  }

  const normalizedValue: IDataObject = {};

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    normalizedValue[key] = toGenericValue(entryValue);
  }

  return normalizedValue;
}

function truncate(value: string, maxLength = 400): string | undefined {
  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return undefined;
  }

  return trimmedValue.length > maxLength
    ? `${trimmedValue.slice(0, maxLength - 3).trimEnd()}...`
    : trimmedValue;
}
