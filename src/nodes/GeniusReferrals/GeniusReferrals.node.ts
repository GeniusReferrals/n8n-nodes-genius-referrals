import type { INodeType } from 'n8n-core';
import {
  NodeApiError,
} from 'n8n-workflow';
import type {
  IDataObject,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeProperties,
  IExecuteFunctions,
} from 'n8n-workflow';
import { getGeniusReferralsApiCredentials, grApiRequestWithAuthentication } from '../../lib/client/GeniusReferralsApiClient';
import {
  buildGeniusReferralsRequestDefinition,
  createOperationProperties,
  GENIUS_REFERRALS_RESOURCE_OPTIONS,
  getOperationsWithBody,
  getOperationsWithParameter,
  GeniusReferralsNodeParameters,
} from './GeniusReferrals.operation';

type GeniusReferralsExecuteContext = IExecuteFunctions & {
  continueOnFail(): boolean;
  getInputData(): INodeExecutionData[];
  getNode(): { [key: string]: unknown };
  getNodeParameter(name: string, itemIndex: number, fallbackValue?: unknown): unknown;
};

type GeniusReferralsLoadOptionsFunctions = ILoadOptionsFunctions & {
  getCurrentNodeParameter(name: string): unknown;
};

export class GeniusReferrals implements INodeType {
  description = {
    version: 1,
    defaults: {
      name: 'Genius Referrals',
    },
    inputs: ['main'],
    outputs: ['main'],
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
        options: GENIUS_REFERRALS_RESOURCE_OPTIONS,
      },
      ...createOperationProperties(),
      {
        displayName: 'Account Slug',
        name: 'accountSlug',
        type: 'options',
        default: '',
        description: 'Account slug used in the GR API path. Accounts load dynamically from the API token.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('accountSlug'),
          },
        },
        options: [],
        typeOptions: {
          loadOptionsMethod: 'getAccounts',
        },
      },
      {
        displayName: 'Client Slug',
        name: 'clientSlug',
        type: 'options',
        default: '',
        description: 'Client slug passed as client_slug for report requests.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('clientSlug'),
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
        default: '',
        description: 'Unique advocate token used by advocate and referral endpoints.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('advocateToken'),
          },
        },
      },
      {
        displayName: 'Campaign Slug',
        name: 'campaignSlug',
        type: 'string',
        default: '',
        description: 'Campaign slug used when retrieving one campaign.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('campaignSlug'),
          },
        },
      },
      {
        displayName: 'Bonus ID',
        name: 'bonusId',
        type: 'string',
        default: '',
        description: 'Numeric bonus identifier.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('bonusId'),
          },
        },
      },
      {
        displayName: 'Trace ID',
        name: 'traceId',
        type: 'string',
        default: '',
        description: 'Trace identifier returned by bonus trace requests.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('traceId'),
          },
        },
      },
      {
        displayName: 'Redemption Request ID',
        name: 'redemptionRequestId',
        type: 'string',
        default: '',
        description: 'Numeric redemption request identifier.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('redemptionRequestId'),
          },
        },
      },
      {
        displayName: 'Referral ID',
        name: 'referralId',
        type: 'string',
        default: '',
        description: 'Numeric referral identifier.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('referralId'),
          },
        },
      },
      {
        displayName: 'Bonuses Redemption Method Slug',
        name: 'bonusesRedemptionMethodSlug',
        type: 'options',
        default: '',
        description: 'Bonuses redemption method slug from the Utilities API.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('bonusesRedemptionMethodSlug'),
          },
        },
        options: [],
        typeOptions: {
          loadOptionsMethod: 'getBonusesRedemptionMethods',
        },
      },
      {
        displayName: 'Currency Code',
        name: 'currencyCode',
        type: 'options',
        default: '',
        description: 'Currency code from the Utilities API.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('currencyCode'),
          },
        },
        options: [],
        typeOptions: {
          loadOptionsMethod: 'getCurrencies',
        },
      },
      {
        displayName: 'Redemption Request Action Slug',
        name: 'requestActionSlug',
        type: 'options',
        default: '',
        description: 'Redemption request action slug from the Utilities API.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('requestActionSlug'),
          },
        },
        options: [],
        typeOptions: {
          loadOptionsMethod: 'getRedemptionRequestActions',
        },
      },
      {
        displayName: 'Redemption Request Status Slug',
        name: 'requestStatusSlug',
        type: 'options',
        default: '',
        description: 'Redemption request status slug from the Utilities API.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('requestStatusSlug'),
          },
        },
        options: [],
        typeOptions: {
          loadOptionsMethod: 'getRedemptionRequestStatuses',
        },
      },
      {
        displayName: 'Referral Origin Slug',
        name: 'referralOriginSlug',
        type: 'options',
        default: '',
        description: 'Referral origin slug from the Utilities API.',
        displayOptions: {
          show: {
            operation: getOperationsWithParameter('referralOriginSlug'),
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
            operation: getOperationsWithParameter('queryJson'),
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
        description:
          'Request payload as JSON. Wrapper keys such as advocate, referral, bonus, and redemption_request are applied automatically when the GR API expects them.',
        displayOptions: {
          show: {
            operation: getOperationsWithBody(),
          },
        },
        typeOptions: {
          rows: 8,
        },
      },
    ] as INodeProperties[],
  };

  methods = {
    loadOptions: {
      async getAccounts(this: GeniusReferralsLoadOptionsFunctions) {
        const response = await loadCollection(this, '/accounts');
        const results = readCollectionEntries(response);

        return results.map((entry) => ({
          name: pickDisplayValue(entry, 'name', 'slug'),
          value: pickDisplayValue(entry, 'slug', 'name'),
        }));
      },
      async getBonusesRedemptionMethods(this: GeniusReferralsLoadOptionsFunctions) {
        return loadUtilityOptions(this, '/utilities/bonuses-redemption-methods');
      },
      async getCurrencies(this: GeniusReferralsLoadOptionsFunctions) {
        return loadUtilityOptions(this, '/utilities/currencies', 'code', 'currency');
      },
      async getRedemptionRequestActions(this: GeniusReferralsLoadOptionsFunctions) {
        return loadUtilityOptions(this, '/utilities/redemption-request-actions');
      },
      async getRedemptionRequestStatuses(this: GeniusReferralsLoadOptionsFunctions) {
        return loadUtilityOptions(this, '/utilities/redemption-request-statuses');
      },
      async getReferralOrigins(this: GeniusReferralsLoadOptionsFunctions) {
        return loadUtilityOptions(this, '/utilities/referral-origins');
      },
    },
  };

  async execute(this: GeniusReferralsExecuteContext): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const credentials = await getGeniusReferralsApiCredentials(this);
    const node = this.getNode();
    const responseItems: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      try {
        const parameters = getNodeOperationParameters(this, itemIndex);
        const request = buildGeniusReferralsRequestDefinition(parameters);
        const response = await grApiRequestWithAuthentication(
          this.helpers.requestWithAuthentication.bind(this.helpers),
          {
            ...request,
            baseUrl: credentials.baseUrl,
          },
        );

        responseItems.push(...toExecutionData(response, itemIndex));
      } catch (error) {
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

        throw new NodeApiError(node, {
          message: error instanceof Error ? error.message : 'Unknown Genius Referrals error',
        });
      }
    }

    return [responseItems];
  }

  private getNodeOperationParameters(
    this: GeniusReferralsExecuteContext,
    itemIndex: number,
  ): GeniusReferralsNodeParameters {
    return getNodeOperationParameters(this, itemIndex);
  }

  private getOptionalStringParameter(
    this: GeniusReferralsExecuteContext,
    name: string,
    itemIndex: number,
  ): string | undefined {
    return getOptionalStringParameter(this, name, itemIndex);
  }
}

function getNodeOperationParameters(
  context: GeniusReferralsExecuteContext,
  itemIndex: number,
): GeniusReferralsNodeParameters {
  return {
    accountSlug: getOptionalStringParameter(context, 'accountSlug', itemIndex),
    advocateToken: getOptionalStringParameter(context, 'advocateToken', itemIndex),
    bonusId: getOptionalStringParameter(context, 'bonusId', itemIndex),
    bonusesRedemptionMethodSlug: getOptionalStringParameter(
      context,
      'bonusesRedemptionMethodSlug',
      itemIndex,
    ),
    campaignSlug: getOptionalStringParameter(context, 'campaignSlug', itemIndex),
    clientSlug: getOptionalStringParameter(context, 'clientSlug', itemIndex),
    currencyCode: getOptionalStringParameter(context, 'currencyCode', itemIndex),
    operation: context.getNodeParameter('operation', itemIndex) as string,
    payloadJson: context.getNodeParameter('payloadJson', itemIndex, '{}') as IDataObject | string,
    queryJson: context.getNodeParameter('queryJson', itemIndex, '{}') as IDataObject | string,
    redemptionRequestId: getOptionalStringParameter(context, 'redemptionRequestId', itemIndex),
    referralId: getOptionalStringParameter(context, 'referralId', itemIndex),
    referralOriginSlug: getOptionalStringParameter(context, 'referralOriginSlug', itemIndex),
    requestActionSlug: getOptionalStringParameter(context, 'requestActionSlug', itemIndex),
    requestStatusSlug: getOptionalStringParameter(context, 'requestStatusSlug', itemIndex),
    resource: context.getNodeParameter(
      'resource',
      itemIndex,
    ) as GeniusReferralsNodeParameters['resource'],
    traceId: getOptionalStringParameter(context, 'traceId', itemIndex),
  };
}

function getOptionalStringParameter(
  context: GeniusReferralsExecuteContext,
  name: string,
  itemIndex: number,
): string | undefined {
  const value = context.getNodeParameter(name, itemIndex, '') as string | undefined;
  const normalizedValue = value?.trim();
  return normalizedValue === undefined || normalizedValue === '' ? undefined : normalizedValue;
}

async function loadCollection(
  context: GeniusReferralsLoadOptionsFunctions,
  endpoint: string,
): Promise<unknown> {
  const credentials = await getGeniusReferralsApiCredentials(context);

  return grApiRequestWithAuthentication(
    context.helpers.requestWithAuthentication.bind(context.helpers),
    {
      baseUrl: credentials.baseUrl,
      endpoint,
      method: 'GET',
    },
  );
}

async function loadUtilityOptions(
  context: GeniusReferralsLoadOptionsFunctions,
  endpoint: string,
  valueKey = 'slug',
  nameKey = 'name',
) {
  const response = await loadCollection(context, endpoint);
  const entries = readCollectionEntries(response);

  return entries.map((entry) => ({
    name: pickDisplayValue(entry, nameKey, valueKey),
    value: pickDisplayValue(entry, valueKey, nameKey),
  }));
}

function readCollectionEntries(response: unknown): IDataObject[] {
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

function isDataObject(value: unknown): value is IDataObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickDisplayValue(entry: IDataObject, primaryKey: string, fallbackKey: string): string {
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

function toExecutionData(response: unknown, itemIndex: number): INodeExecutionData[] {
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
        value: response as string | number | boolean | null | undefined,
      },
      pairedItem: {
        item: itemIndex,
      },
    },
  ];
}

function attachPagination(entry: IDataObject, data: IDataObject): IDataObject {
  const pagination: IDataObject = {};

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
