"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeniusReferralsApiError = void 0;
exports.toGeniusReferralsApiError = toGeniusReferralsApiError;
exports.toGeniusReferralsNodeApiErrorResponse = toGeniusReferralsNodeApiErrorResponse;
exports.createGeniusReferralsNodeApiError = createGeniusReferralsNodeApiError;
const DEFAULT_ERROR_MESSAGE = 'Genius Referrals API request failed.';
class GeniusReferralsApiError extends Error {
    constructor(options) {
        super(options.message);
        this.name = 'GeniusReferralsApiError';
        this.statusCode = options.statusCode;
        this.endpoint = options.endpoint;
        this.method = options.method;
        this.apiCode = options.apiCode;
        this.details = options.details;
        this.responseBody = options.responseBody;
    }
}
exports.GeniusReferralsApiError = GeniusReferralsApiError;
function toGeniusReferralsApiError(error, requestOptions) {
    if (error instanceof GeniusReferralsApiError) {
        return error;
    }
    const errorLike = (error ?? {});
    const responseBody = errorLike.response?.data ?? errorLike.response?.body ?? errorLike.body ?? errorLike.error;
    const parsedBody = asDataObject(responseBody);
    const statusCode = errorLike.response?.statusCode ??
        errorLike.response?.status ??
        errorLike.statusCode;
    const apiMessage = pickString(parsedBody?.message) ??
        pickString(parsedBody?.error) ??
        pickString(parsedBody?.description);
    const apiCode = pickString(parsedBody?.code) ?? pickString(parsedBody?.errorCode);
    const details = parsedBody?.details ?? parsedBody?.errors;
    const fallbackMessage = errorLike.message ??
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
function toGeniusReferralsNodeApiErrorResponse(error, requestOptions) {
    const apiError = toGeniusReferralsApiError(error, requestOptions);
    const validationSummary = summarizeDetails(apiError.details);
    const description = [
        apiError.apiCode ? `API code: ${apiError.apiCode}` : undefined,
        validationSummary ? `Validation details: ${validationSummary}` : undefined,
        `Request: ${apiError.method} ${apiError.endpoint}`,
    ]
        .filter((part) => Boolean(part))
        .join(' | ');
    const responseData = {
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
function createGeniusReferralsNodeApiError(nodeApiErrorCtor, node, error, requestOptions, options = {}) {
    const errorResponse = toGeniusReferralsNodeApiErrorResponse(error, requestOptions);
    const nodeApiErrorOptions = {
        ...options,
        description: options.description ?? pickString(errorResponse.description),
        httpCode: options.httpCode ?? pickString(errorResponse.httpCode),
        message: options.message ?? pickString(errorResponse.message),
    };
    try {
        return new nodeApiErrorCtor(node, errorResponse, nodeApiErrorOptions);
    }
    catch (nodeApiError) {
        if (!isGetNodeError(nodeApiError)) {
            // eslint-disable-next-line @n8n/community-nodes/require-node-api-error -- Preserve unexpected constructor failures.
            throw nodeApiError;
        }
        const apiError = toGeniusReferralsApiError(error, requestOptions);
        apiError.name = 'NodeApiError';
        Object.assign(apiError, {
            context: {
                itemIndex: options.itemIndex,
                runIndex: options.runIndex,
            },
            description: nodeApiErrorOptions.description,
            httpCode: nodeApiErrorOptions.httpCode,
            node,
        });
        return apiError;
    }
}
function asDataObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return undefined;
    }
    return value;
}
function pickString(value) {
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}
function isGetNodeError(error) {
    return error instanceof TypeError && /getNode/.test(error.message);
}
function summarizeDetails(value) {
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
            .filter((entry) => Boolean(entry));
        return truncate(parts.join('; '));
    }
    const entries = Object.entries(value)
        .map(([key, entryValue]) => {
        const summary = summarizeDetails(entryValue);
        return summary ? `${key}: ${summary}` : undefined;
    })
        .filter((entry) => Boolean(entry));
    return truncate(entries.join('; '));
}
function toGenericValue(value) {
    if (value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((entry) => toGenericValue(entry));
    }
    const normalizedValue = {};
    for (const [key, entryValue] of Object.entries(value)) {
        normalizedValue[key] = toGenericValue(entryValue);
    }
    return normalizedValue;
}
function truncate(value, maxLength = 400) {
    const trimmedValue = value.trim();
    if (trimmedValue === '') {
        return undefined;
    }
    return trimmedValue.length > maxLength
        ? `${trimmedValue.slice(0, maxLength - 3).trimEnd()}...`
        : trimmedValue;
}
