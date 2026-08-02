"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeniusReferrals = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const GeniusReferralsApiClient_1 = require("../../lib/client/GeniusReferralsApiClient");
const GeniusReferrals_operation_1 = require("./GeniusReferrals.operation");
class GeniusReferrals {
    constructor() {
        this.description = {
            version: 1,
            icon: {
                light: 'file:../../icons/genius-referrals.svg',
                dark: 'file:../../icons/genius-referrals-dark.png',
            },
            subtitle: '={{$parameter["operation"]}}',
            defaults: {
                name: 'Genius Referrals',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'geniusReferralsApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    default: 'accounts',
                    options: GeniusReferrals_operation_1.GENIUS_REFERRALS_RESOURCE_OPTIONS,
                },
                ...(0, GeniusReferrals_operation_1.createOperationProperties)(),
                {
                    displayName: 'Account Slug Name or ID',
                    name: 'accountSlug',
                    type: 'options',
                    default: '',
                    description: 'Account slug used in the GR API path. Accounts load dynamically from the API token. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('accountSlug'),
                        },
                    },
                    options: [],
                    typeOptions: {
                        loadOptionsMethod: 'getAccounts',
                    },
                },
                {
                    displayName: 'Client Slug Name or ID',
                    name: 'clientSlug',
                    type: 'options',
                    default: '',
                    description: 'Client slug passed as client_slug for report requests. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('clientSlug'),
                        },
                    },
                    options: [],
                    typeOptions: {
                        loadOptionsMethod: 'getAccounts',
                    },
                },
                {
                    displayName: 'Advocate Token',
                    name: 'advocateToken',
                    type: 'string',
                    typeOptions: { password: true },
                    default: '',
                    description: 'Unique advocate token used by advocate and referral endpoints',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('advocateToken'),
                        },
                    },
                },
                {
                    displayName: 'Campaign Slug',
                    name: 'campaignSlug',
                    type: 'string',
                    default: '',
                    description: 'Campaign slug used when retrieving one campaign',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('campaignSlug'),
                        },
                    },
                },
                {
                    displayName: 'Bonus ID',
                    name: 'bonusId',
                    type: 'string',
                    default: '',
                    description: 'Numeric bonus identifier',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('bonusId'),
                        },
                    },
                },
                {
                    displayName: 'Trace ID',
                    name: 'traceId',
                    type: 'string',
                    default: '',
                    description: 'Trace identifier returned by bonus trace requests',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('traceId'),
                        },
                    },
                },
                {
                    displayName: 'Redemption Request ID',
                    name: 'redemptionRequestId',
                    type: 'string',
                    default: '',
                    description: 'Numeric redemption request identifier',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('redemptionRequestId'),
                        },
                    },
                },
                {
                    displayName: 'Referral ID',
                    name: 'referralId',
                    type: 'string',
                    default: '',
                    description: 'Numeric referral identifier',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('referralId'),
                        },
                    },
                },
                {
                    displayName: 'Bonuses Redemption Method Slug Name or ID',
                    name: 'bonusesRedemptionMethodSlug',
                    type: 'options',
                    default: '',
                    description: 'Bonuses redemption method slug from the Utilities API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('bonusesRedemptionMethodSlug'),
                        },
                    },
                    options: [],
                    typeOptions: {
                        loadOptionsMethod: 'getBonusesRedemptionMethods',
                    },
                },
                {
                    displayName: 'Currency Code Name or ID',
                    name: 'currencyCode',
                    type: 'options',
                    default: '',
                    description: 'Currency code from the Utilities API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('currencyCode'),
                        },
                    },
                    options: [],
                    typeOptions: {
                        loadOptionsMethod: 'getCurrencies',
                    },
                },
                {
                    displayName: 'Redemption Request Action Slug Name or ID',
                    name: 'requestActionSlug',
                    type: 'options',
                    default: '',
                    description: 'Redemption request action slug from the Utilities API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('requestActionSlug'),
                        },
                    },
                    options: [],
                    typeOptions: {
                        loadOptionsMethod: 'getRedemptionRequestActions',
                    },
                },
                {
                    displayName: 'Redemption Request Status Slug Name or ID',
                    name: 'requestStatusSlug',
                    type: 'options',
                    default: '',
                    description: 'Redemption request status slug from the Utilities API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('requestStatusSlug'),
                        },
                    },
                    options: [],
                    typeOptions: {
                        loadOptionsMethod: 'getRedemptionRequestStatuses',
                    },
                },
                {
                    displayName: 'Referral Origin Slug Name or ID',
                    name: 'referralOriginSlug',
                    type: 'options',
                    default: '',
                    description: 'Referral origin slug from the Utilities API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('referralOriginSlug'),
                        },
                    },
                    options: [],
                    typeOptions: {
                        loadOptionsMethod: 'getReferralOrigins',
                    },
                },
                {
                    displayName: 'Query JSON',
                    name: 'queryJson',
                    type: 'json',
                    default: '{}',
                    description: 'Optional query-string parameters as JSON. Reports also merge client_slug from the Client Slug field.',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithParameter)('queryJson'),
                        },
                    },
                    typeOptions: {
                        rows: 6,
                    },
                },
                {
                    displayName: 'Payload JSON',
                    name: 'payloadJson',
                    type: 'json',
                    default: '{}',
                    description: 'Request payload as JSON. Wrapper keys such as advocate, referral, bonus, and redemption_request are applied automatically when the GR API expects them.',
                    displayOptions: {
                        show: {
                            operation: (0, GeniusReferrals_operation_1.getOperationsWithBody)(),
                        },
                    },
                    typeOptions: {
                        rows: 8,
                    },
                },
            ],
            usableAsTool: true,
        };
        this.methods = {
            loadOptions: {
                async getAccounts() {
                    const response = await loadCollection(this, '/accounts');
                    const results = readCollectionEntries(response);
                    return results.map((entry) => ({
                        name: pickDisplayValue(entry, 'name', 'slug'),
                        value: pickDisplayValue(entry, 'slug', 'name'),
                    }));
                },
                async getBonusesRedemptionMethods() {
                    return loadUtilityOptions(this, '/utilities/bonuses-redemption-methods');
                },
                async getCurrencies() {
                    return loadUtilityOptions(this, '/utilities/currencies', 'code', 'currency');
                },
                async getRedemptionRequestActions() {
                    return loadUtilityOptions(this, '/utilities/redemption-request-actions');
                },
                async getRedemptionRequestStatuses() {
                    return loadUtilityOptions(this, '/utilities/redemption-request-statuses');
                },
                async getReferralOrigins() {
                    return loadUtilityOptions(this, '/utilities/referral-origins');
                },
            },
        };
    }
    async execute() {
        const items = this.getInputData();
        const credentials = await (0, GeniusReferralsApiClient_1.getGeniusReferralsApiCredentials)(this);
        const node = this.getNode();
        const responseItems = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
            try {
                const parameters = getNodeOperationParameters(this, itemIndex);
                const request = (0, GeniusReferrals_operation_1.buildGeniusReferralsRequestDefinition)(parameters, node);
                const response = await (0, GeniusReferralsApiClient_1.grApiRequestWithAuthentication)(this.helpers.httpRequestWithAuthentication.bind(this.helpers), {
                    ...request,
                    baseUrl: credentials.baseUrl,
                });
                responseItems.push(...toExecutionData(response, itemIndex));
            }
            catch (error) {
                if (this.continueOnFail()) {
                    responseItems.push({
                        json: {
                            error: error instanceof Error ? error.message : 'Unknown Genius Referrals error',
                        },
                        pairedItem: {
                            item: itemIndex,
                        },
                    });
                    continue;
                }
                throw new n8n_workflow_1.NodeApiError(node, {
                    message: error instanceof Error ? error.message : 'Unknown Genius Referrals error',
                });
            }
        }
        return [responseItems];
    }
    getNodeOperationParameters(itemIndex) {
        return getNodeOperationParameters(this, itemIndex);
    }
    getOptionalStringParameter(name, itemIndex) {
        return getOptionalStringParameter(this, name, itemIndex);
    }
}
exports.GeniusReferrals = GeniusReferrals;
function getNodeOperationParameters(context, itemIndex) {
    return {
        accountSlug: getOptionalStringParameter(context, 'accountSlug', itemIndex),
        advocateToken: getOptionalStringParameter(context, 'advocateToken', itemIndex),
        bonusId: getOptionalStringParameter(context, 'bonusId', itemIndex),
        bonusesRedemptionMethodSlug: getOptionalStringParameter(context, 'bonusesRedemptionMethodSlug', itemIndex),
        campaignSlug: getOptionalStringParameter(context, 'campaignSlug', itemIndex),
        clientSlug: getOptionalStringParameter(context, 'clientSlug', itemIndex),
        currencyCode: getOptionalStringParameter(context, 'currencyCode', itemIndex),
        operation: context.getNodeParameter('operation', itemIndex),
        payloadJson: context.getNodeParameter('payloadJson', itemIndex, '{}'),
        queryJson: context.getNodeParameter('queryJson', itemIndex, '{}'),
        redemptionRequestId: getOptionalStringParameter(context, 'redemptionRequestId', itemIndex),
        referralId: getOptionalStringParameter(context, 'referralId', itemIndex),
        referralOriginSlug: getOptionalStringParameter(context, 'referralOriginSlug', itemIndex),
        requestActionSlug: getOptionalStringParameter(context, 'requestActionSlug', itemIndex),
        requestStatusSlug: getOptionalStringParameter(context, 'requestStatusSlug', itemIndex),
        resource: context.getNodeParameter('resource', itemIndex),
        traceId: getOptionalStringParameter(context, 'traceId', itemIndex),
    };
}
function getOptionalStringParameter(context, name, itemIndex) {
    const value = context.getNodeParameter(name, itemIndex, '');
    const normalizedValue = value?.trim();
    return normalizedValue === undefined || normalizedValue === '' ? undefined : normalizedValue;
}
async function loadCollection(context, endpoint) {
    const credentials = await (0, GeniusReferralsApiClient_1.getGeniusReferralsApiCredentials)(context);
    return (0, GeniusReferralsApiClient_1.grApiRequestWithAuthentication)(context.helpers.httpRequestWithAuthentication.bind(context.helpers), {
        baseUrl: credentials.baseUrl,
        endpoint,
        method: 'GET',
    });
}
async function loadUtilityOptions(context, endpoint, valueKey = 'slug', nameKey = 'name') {
    const response = await loadCollection(context, endpoint);
    const entries = readCollectionEntries(response);
    return entries.map((entry) => ({
        name: pickDisplayValue(entry, nameKey, valueKey),
        value: pickDisplayValue(entry, valueKey, nameKey),
    }));
}
function readCollectionEntries(response) {
    if (!isDataObject(response)) {
        return [];
    }
    const data = response.data;
    if (isDataObject(data) && Array.isArray(data.results)) {
        return data.results.filter(isDataObject);
    }
    if (Array.isArray(data)) {
        return data.filter(isDataObject);
    }
    return [];
}
function isDataObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function pickDisplayValue(entry, primaryKey, fallbackKey) {
    const primaryValue = entry[primaryKey];
    const fallbackValue = entry[fallbackKey];
    if (typeof primaryValue === 'string' && primaryValue.trim() !== '') {
        return primaryValue;
    }
    if (typeof fallbackValue === 'string' && fallbackValue.trim() !== '') {
        return fallbackValue;
    }
    return `${primaryKey}:${fallbackKey}`;
}
function toExecutionData(response, itemIndex) {
    if (isDataObject(response)) {
        const data = response.data;
        if (isDataObject(data) && Array.isArray(data.results)) {
            return data.results.map((entry) => ({
                json: isDataObject(entry) ? attachPagination(entry, data) : { value: entry },
                pairedItem: {
                    item: itemIndex,
                },
            }));
        }
        if (Array.isArray(data)) {
            return data.map((entry) => ({
                json: isDataObject(entry) ? entry : { value: entry },
                pairedItem: {
                    item: itemIndex,
                },
            }));
        }
        if (isDataObject(data)) {
            return [
                {
                    json: data,
                    pairedItem: {
                        item: itemIndex,
                    },
                },
            ];
        }
        return [
            {
                json: response,
                pairedItem: {
                    item: itemIndex,
                },
            },
        ];
    }
    if (Array.isArray(response)) {
        return response.map((entry) => ({
            json: isDataObject(entry) ? entry : { value: entry },
            pairedItem: {
                item: itemIndex,
            },
        }));
    }
    return [
        {
            json: {
                value: response,
            },
            pairedItem: {
                item: itemIndex,
            },
        },
    ];
}
function attachPagination(entry, data) {
    const pagination = {};
    for (const key of ['page', 'limit', 'total']) {
        const value = data[key];
        if (value !== undefined) {
            pagination[key] = value;
        }
    }
    return Object.keys(pagination).length === 0
        ? entry
        : {
            ...entry,
            _grPagination: pagination,
        };
}
