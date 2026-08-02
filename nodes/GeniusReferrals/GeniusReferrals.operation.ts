import { NodeApiError } from 'n8n-workflow';
import type { IDataObject, IHttpRequestMethods, INode, INodeProperties, JsonObject } from 'n8n-workflow';

export type GeniusReferralsResource =
  | 'accounts'
  | 'advocates'
  | 'bonuses'
  | 'campaigns'
  | 'redemptionRequests'
  | 'referrals'
  | 'reports'
  | 'utilities';

export type GeniusReferralsParameterName =
  | 'accountSlug'
  | 'advocateToken'
  | 'bonusId'
  | 'bonusesRedemptionMethodSlug'
  | 'campaignSlug'
  | 'clientSlug'
  | 'currencyCode'
  | 'queryJson'
  | 'payloadJson'
  | 'redemptionRequestId'
  | 'referralId'
  | 'referralOriginSlug'
  | 'requestActionSlug'
  | 'requestStatusSlug'
  | 'traceId';

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

interface GeniusReferralsOperationDefinition {
  bodyStrategy?: 'raw' | 'wrapped';
  bodyWrapperKey?: string;
  description: string;
  endpoint: (parameters: GeniusReferralsNodeParameters) => string;
  method: IHttpRequestMethods;
  name: string;
  queryDefaults?: (parameters: GeniusReferralsNodeParameters) => IDataObject;
  requiresQueryKeys?: string[];
  resource: GeniusReferralsResource;
  value: string;
}

const RESOURCE_LABELS: Record<GeniusReferralsResource, string> = {
  accounts: 'Accounts',
  advocates: 'Advocates',
  bonuses: 'Bonuses',
  campaigns: 'Campaigns',
  redemptionRequests: 'Redemption Requests',
  referrals: 'Referrals',
  reports: 'Reports',
  utilities: 'Utilities',
};

export const GENIUS_REFERRALS_RESOURCE_OPTIONS: Array<{ name: string; value: GeniusReferralsResource }> =
  (Object.keys(RESOURCE_LABELS) as GeniusReferralsResource[]).map((resource) => ({
    name: RESOURCE_LABELS[resource],
    value: resource,
  }));

const OPERATION_DEFINITIONS: GeniusReferralsOperationDefinition[] = [
  {
    description: 'Retrieve the list of Genius Referrals accounts available to the API token',
    endpoint: () => '/accounts',
    method: 'GET',
    name: 'Get All Accounts',
    resource: 'accounts',
    value: 'accountsGetAll',
  },
  {
    description: 'Retrieve one account by its slug',
    endpoint: (parameters) => `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}`,
    method: 'GET',
    name: 'Get an Account',
    resource: 'accounts',
    value: 'accountsGet',
  },
  {
    description: 'Delete every advocate for the selected account',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates`,
    method: 'DELETE',
    name: 'Delete All Advocates',
    resource: 'advocates',
    value: 'advocatesDeleteAll',
  },
  {
    description: 'Retrieve advocates for the selected account',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates`,
    method: 'GET',
    name: 'Get Advocates',
    resource: 'advocates',
    value: 'advocatesGetAll',
  },
  {
    bodyStrategy: 'wrapped',
    bodyWrapperKey: 'advocate',
    description: 'Create a new advocate payload for the selected account',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates`,
    method: 'POST',
    name: 'Create an Advocate',
    resource: 'advocates',
    value: 'advocatesCreate',
  },
  {
    description: 'Delete one advocate by token',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}`,
    method: 'DELETE',
    name: 'Delete an Advocate',
    resource: 'advocates',
    value: 'advocatesDelete',
  },
  {
    description: 'Retrieve one advocate by token',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}`,
    method: 'GET',
    name: 'Get an Advocate',
    resource: 'advocates',
    value: 'advocatesGet',
  },
  {
    bodyStrategy: 'raw',
    description: 'Partially update an advocate using the flat PATCH payload expected by the GR API',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}`,
    method: 'PATCH',
    name: 'Patch an Advocate',
    resource: 'advocates',
    value: 'advocatesPatch',
  },
  {
    bodyStrategy: 'wrapped',
    bodyWrapperKey: 'advocate',
    description: 'Fully replace an advocate using the wrapped PUT payload expected by the GR API',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}`,
    method: 'PUT',
    name: 'Replace an Advocate',
    resource: 'advocates',
    value: 'advocatesPut',
  },
  {
    description: 'Retrieve the share links for one advocate',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}/share-links`,
    method: 'GET',
    name: 'Get Share Links',
    resource: 'advocates',
    value: 'advocatesShareLinks',
  },
  {
    description: 'Retrieve bonuses for the selected account',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/bonuses`,
    method: 'GET',
    name: 'Get Bonuses',
    resource: 'bonuses',
    value: 'bonusesGetAll',
  },
  {
    bodyStrategy: 'wrapped',
    bodyWrapperKey: 'bonus',
    description: 'Create a bonus using the wrapped GR bonus payload',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/bonuses`,
    method: 'POST',
    name: 'Create a Bonus',
    resource: 'bonuses',
    value: 'bonusesCreate',
  },
  {
    description: 'Check whether a bonus would be issued using the idempotent bonus checkup endpoint',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/bonuses/checkup`,
    method: 'GET',
    name: 'Check for Bonus',
    queryDefaults: () => ({}),
    requiresQueryKeys: ['advocate_token', 'reference', 'payment_amount', 'campaign_slug'],
    resource: 'bonuses',
    value: 'bonusesCheckup',
  },
  {
    bodyStrategy: 'wrapped',
    bodyWrapperKey: 'bonus',
    description: 'Force-create a bonus even when normal campaign restrictions would block it',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/bonuses/force`,
    method: 'POST',
    name: 'Force-Create a Bonus',
    resource: 'bonuses',
    value: 'bonusesForceCreate',
  },
  {
    description: 'Retrieve bonus request traces for the selected account',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/bonuses/traces`,
    method: 'GET',
    name: 'Get Bonus Traces',
    resource: 'bonuses',
    value: 'bonusesGetTraces',
  },
  {
    description: 'Retrieve one bonus request trace by ID',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/bonuses/traces/${encodePathParameter(parameters.traceId, 'Trace ID')}`,
    method: 'GET',
    name: 'Get a Bonus Trace',
    resource: 'bonuses',
    value: 'bonusesGetTrace',
  },
  {
    description: 'Delete one bonus by ID',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/bonuses/${encodePathParameter(parameters.bonusId, 'Bonus ID')}`,
    method: 'DELETE',
    name: 'Delete a Bonus',
    resource: 'bonuses',
    value: 'bonusesDelete',
  },
  {
    description: 'Retrieve one bonus by ID',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/bonuses/${encodePathParameter(parameters.bonusId, 'Bonus ID')}`,
    method: 'GET',
    name: 'Get a Bonus',
    resource: 'bonuses',
    value: 'bonusesGet',
  },
  {
    bodyStrategy: 'raw',
    description: 'Patch a bonus using the flat GR bonus update payload',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/bonuses/${encodePathParameter(parameters.bonusId, 'Bonus ID')}`,
    method: 'PATCH',
    name: 'Patch a Bonus',
    resource: 'bonuses',
    value: 'bonusesPatch',
  },
  {
    description: 'Retrieve campaigns for the selected account',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/campaigns`,
    method: 'GET',
    name: 'Get Campaigns',
    resource: 'campaigns',
    value: 'campaignsGetAll',
  },
  {
    description: 'Retrieve one campaign by slug',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/campaigns/${encodePathParameter(parameters.campaignSlug, 'Campaign Slug')}`,
    method: 'GET',
    name: 'Get a Campaign',
    resource: 'campaigns',
    value: 'campaignsGet',
  },
  {
    description: 'Retrieve redemption requests for the selected account',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/redemption-requests`,
    method: 'GET',
    name: 'Get Redemption Requests',
    resource: 'redemptionRequests',
    value: 'redemptionRequestsGetAll',
  },
  {
    bodyStrategy: 'wrapped',
    bodyWrapperKey: 'redemption_request',
    description: 'Create a redemption request using the wrapped GR payload',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/redemption-requests`,
    method: 'POST',
    name: 'Create a Redemption Request',
    resource: 'redemptionRequests',
    value: 'redemptionRequestsCreate',
  },
  {
    description: 'Retrieve one redemption request by ID',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/redemption-requests/${encodePathParameter(parameters.redemptionRequestId, 'Redemption Request ID')}`,
    method: 'GET',
    name: 'Get a Redemption Request',
    resource: 'redemptionRequests',
    value: 'redemptionRequestsGet',
  },
  {
    bodyStrategy: 'raw',
    description: 'Patch a redemption request using the flat GR PATCH payload',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/redemption-requests/${encodePathParameter(parameters.redemptionRequestId, 'Redemption Request ID')}`,
    method: 'PATCH',
    name: 'Patch a Redemption Request',
    resource: 'redemptionRequests',
    value: 'redemptionRequestsPatch',
  },
  {
    bodyStrategy: 'raw',
    description: 'Redeem a redemption request by calling the dedicated redemption PATCH endpoint',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/redemption-requests/${encodePathParameter(parameters.redemptionRequestId, 'Redemption Request ID')}/redemption`,
    method: 'PATCH',
    name: 'Redeem a Redemption Request',
    resource: 'redemptionRequests',
    value: 'redemptionRequestsRedeem',
  },
  {
    description: 'Retrieve referrals for one advocate',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}/referrals`,
    method: 'GET',
    name: 'Get Referrals',
    resource: 'referrals',
    value: 'referralsGetAll',
  },
  {
    bodyStrategy: 'wrapped',
    bodyWrapperKey: 'referral',
    description: 'Create a referral using the wrapped GR referral payload',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}/referrals`,
    method: 'POST',
    name: 'Create a Referral',
    resource: 'referrals',
    value: 'referralsCreate',
  },
  {
    description: 'Delete one referral by ID',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}/referrals/${encodePathParameter(parameters.referralId, 'Referral ID')}`,
    method: 'DELETE',
    name: 'Delete a Referral',
    resource: 'referrals',
    value: 'referralsDelete',
  },
  {
    description: 'Retrieve one referral by ID',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}/referrals/${encodePathParameter(parameters.referralId, 'Referral ID')}`,
    method: 'GET',
    name: 'Get a Referral',
    resource: 'referrals',
    value: 'referralsGet',
  },
  {
    bodyStrategy: 'wrapped',
    bodyWrapperKey: 'referral',
    description: 'Replace a referral using the wrapped GR PUT payload',
    endpoint: (parameters) =>
      `/accounts/${encodePathParameter(parameters.accountSlug, 'Account Slug')}/advocates/${encodePathParameter(parameters.advocateToken, 'Advocate Token')}/referrals/${encodePathParameter(parameters.referralId, 'Referral ID')}`,
    method: 'PUT',
    name: 'Replace a Referral',
    resource: 'referrals',
    value: 'referralsPut',
  },
  {
    description: 'Retrieve the 1099 tax report',
    endpoint: () => '/reports/1099-tax-report',
    method: 'GET',
    name: 'Get 1099 Tax Report',
    queryDefaults: (parameters) => buildClientSlugQuery(parameters),
    requiresQueryKeys: ['client_slug'],
    resource: 'reports',
    value: 'reports1099Tax',
  },
  {
    description: 'Retrieve the bonuses daily given report',
    endpoint: () => '/reports/bonuses-daily-given',
    method: 'GET',
    name: 'Get Bonuses Daily Given',
    queryDefaults: (parameters) => buildClientSlugQuery(parameters),
    requiresQueryKeys: ['client_slug'],
    resource: 'reports',
    value: 'reportsBonusesDailyGiven',
  },
  {
    description: 'Retrieve the bonuses summary per origin report',
    endpoint: () => '/reports/bonuses-summary-per-origin',
    method: 'GET',
    name: 'Get Bonuses Summary per Origin',
    queryDefaults: (parameters) => buildClientSlugQuery(parameters),
    requiresQueryKeys: ['client_slug'],
    resource: 'reports',
    value: 'reportsBonusesSummaryPerOrigin',
  },
  {
    description: 'Retrieve the click daily participation report',
    endpoint: () => '/reports/click-daily-participation',
    method: 'GET',
    name: 'Get Click Daily Participation',
    queryDefaults: (parameters) => buildClientSlugQuery(parameters),
    requiresQueryKeys: ['client_slug'],
    resource: 'reports',
    value: 'reportsClickDailyParticipation',
  },
  {
    description: 'Retrieve the referral daily participation report',
    endpoint: () => '/reports/referral-daily-participation',
    method: 'GET',
    name: 'Get Referral Daily Participation',
    queryDefaults: (parameters) => buildClientSlugQuery(parameters),
    requiresQueryKeys: ['client_slug'],
    resource: 'reports',
    value: 'reportsReferralDailyParticipation',
  },
  {
    description: 'Retrieve the referrals summary per origin report',
    endpoint: () => '/reports/referrals-summary-per-origin',
    method: 'GET',
    name: 'Get Referrals Summary per Origin',
    queryDefaults: (parameters) => buildClientSlugQuery(parameters),
    requiresQueryKeys: ['client_slug'],
    resource: 'reports',
    value: 'reportsReferralsSummaryPerOrigin',
  },
  {
    description: 'Retrieve the revenue report',
    endpoint: () => '/reports/revenue',
    method: 'GET',
    name: 'Get Revenue Report',
    queryDefaults: (parameters) => buildClientSlugQuery(parameters),
    requiresQueryKeys: ['client_slug'],
    resource: 'reports',
    value: 'reportsRevenue',
  },
  {
    description: 'Retrieve the share daily participation report',
    endpoint: () => '/reports/share-daily-participation',
    method: 'GET',
    name: 'Get Share Daily Participation',
    queryDefaults: (parameters) => buildClientSlugQuery(parameters),
    requiresQueryKeys: ['client_slug'],
    resource: 'reports',
    value: 'reportsShareDailyParticipation',
  },
  {
    description: 'Retrieve the top advocates report',
    endpoint: () => '/reports/top-advocates',
    method: 'GET',
    name: 'Get Top Advocates',
    queryDefaults: (parameters) => buildClientSlugQuery(parameters),
    requiresQueryKeys: ['client_slug'],
    resource: 'reports',
    value: 'reportsTopAdvocates',
  },
  {
    description: 'Retrieve bonuses redemption methods',
    endpoint: () => '/utilities/bonuses-redemption-methods',
    method: 'GET',
    name: 'Get Bonuses Redemption Methods',
    resource: 'utilities',
    value: 'utilitiesGetBonusesRedemptionMethods',
  },
  {
    description: 'Retrieve one bonuses redemption method by slug',
    endpoint: (parameters) =>
      `/utilities/bonuses-redemption-methods/${encodePathParameter(parameters.bonusesRedemptionMethodSlug, 'Bonuses Redemption Method Slug')}`,
    method: 'GET',
    name: 'Get a Bonuses Redemption Method',
    resource: 'utilities',
    value: 'utilitiesGetBonusesRedemptionMethod',
  },
  {
    description: 'Retrieve supported currencies',
    endpoint: () => '/utilities/currencies',
    method: 'GET',
    name: 'Get Currencies',
    resource: 'utilities',
    value: 'utilitiesGetCurrencies',
  },
  {
    description: 'Retrieve one currency by code',
    endpoint: (parameters) =>
      `/utilities/currencies/${encodePathParameter(parameters.currencyCode, 'Currency Code')}`,
    method: 'GET',
    name: 'Get a Currency',
    resource: 'utilities',
    value: 'utilitiesGetCurrency',
  },
  {
    description: 'Retrieve payment methods supported by the platform',
    endpoint: () => '/utilities/payment-methods',
    method: 'GET',
    name: 'Get Payment Methods',
    resource: 'utilities',
    value: 'utilitiesGetPaymentMethods',
  },
  {
    description: 'Verify that the current credential can authenticate successfully',
    endpoint: () => '/test-authentication',
    method: 'GET',
    name: 'Test Authentication',
    resource: 'utilities',
    value: 'utilitiesTestAuthentication',
  },
  {
    description: 'Retrieve redemption request actions',
    endpoint: () => '/utilities/redemption-request-actions',
    method: 'GET',
    name: 'Get Redemption Request Actions',
    resource: 'utilities',
    value: 'utilitiesGetRedemptionRequestActions',
  },
  {
    description: 'Retrieve one redemption request action by slug',
    endpoint: (parameters) =>
      `/utilities/redemption-request-actions/${encodePathParameter(parameters.requestActionSlug, 'Request Action Slug')}`,
    method: 'GET',
    name: 'Get a Redemption Request Action',
    resource: 'utilities',
    value: 'utilitiesGetRedemptionRequestAction',
  },
  {
    description: 'Retrieve redemption request statuses',
    endpoint: () => '/utilities/redemption-request-statuses',
    method: 'GET',
    name: 'Get Redemption Request Statuses',
    resource: 'utilities',
    value: 'utilitiesGetRedemptionRequestStatuses',
  },
  {
    description: 'Retrieve one redemption request status by slug',
    endpoint: (parameters) =>
      `/utilities/redemption-request-statuses/${encodePathParameter(parameters.requestStatusSlug, 'Request Status Slug')}`,
    method: 'GET',
    name: 'Get a Redemption Request Status',
    resource: 'utilities',
    value: 'utilitiesGetRedemptionRequestStatus',
  },
  {
    description: 'Retrieve referral origins',
    endpoint: () => '/utilities/referral-origins',
    method: 'GET',
    name: 'Get Referral Origins',
    resource: 'utilities',
    value: 'utilitiesGetReferralOrigins',
  },
  {
    description: 'Retrieve one referral origin by slug',
    endpoint: (parameters) =>
      `/utilities/referral-origins/${encodePathParameter(parameters.referralOriginSlug, 'Referral Origin Slug')}`,
    method: 'GET',
    name: 'Get a Referral Origin',
    resource: 'utilities',
    value: 'utilitiesGetReferralOrigin',
  },
];

const OPERATION_BY_VALUE = new Map(
  OPERATION_DEFINITIONS.map((operation) => [operation.value, operation] as const),
);

export const GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE: Record<
  GeniusReferralsResource,
  Array<{ description: string; name: string; value: string }>
> = buildOperationsByResource();

export function buildGeniusReferralsRequestDefinition(
  parameters: GeniusReferralsNodeParameters,
  node: INode = GENIUS_REFERRALS_VALIDATION_NODE,
): GeniusReferralsBuiltRequest {
  const definition = getOperationDefinition(parameters.operation);
  const query = parseOptionalDataObject(parameters.queryJson, 'Query JSON', node);
  const request: GeniusReferralsBuiltRequest = {
    endpoint: definition.endpoint(parameters),
    method: definition.method,
  };

  const mergedQuery = {
    ...(definition.queryDefaults?.(parameters) ?? {}),
    ...query,
  };

  if (Object.keys(mergedQuery).length > 0) {
    request.qs = mergedQuery;
  }

  if (definition.requiresQueryKeys !== undefined) {
    assertRequiredQueryKeys(mergedQuery, definition.requiresQueryKeys);
  }

  if (definition.bodyStrategy !== undefined) {
    request.body = buildRequestBody(
      definition.bodyStrategy,
      definition.bodyWrapperKey,
      parameters.payloadJson,
      node,
    );
  }

  return request;
}

export function createOperationProperties(): INodeProperties[] {
  return OPERATION_PROPERTIES;
}

export function getOperationsForResource(resource: GeniusReferralsResource): string[] {
  return OPERATION_DEFINITIONS.filter((operation) => operation.resource === resource).map(
    (operation) => operation.value,
  );
}

export function getOperationsWithBody(): string[] {
  return OPERATION_DEFINITIONS.filter((operation) => operation.bodyStrategy !== undefined).map(
    (operation) => operation.value,
  );
}

export function getOperationsWithParameter(parameterName: GeniusReferralsParameterName): string[] {
  switch (parameterName) {
    case 'accountSlug':
      return [
        'accountsGet',
        ...getOperationsForResource('advocates'),
        ...getOperationsForResource('bonuses'),
        ...getOperationsForResource('campaigns'),
        ...getOperationsForResource('redemptionRequests'),
        ...getOperationsForResource('referrals'),
      ];
    case 'advocateToken':
      return [
        'advocatesDelete',
        'advocatesGet',
        'advocatesPatch',
        'advocatesPut',
        'advocatesShareLinks',
        ...getOperationsForResource('referrals'),
      ];
    case 'bonusId':
      return ['bonusesDelete', 'bonusesGet', 'bonusesPatch'];
    case 'bonusesRedemptionMethodSlug':
      return ['utilitiesGetBonusesRedemptionMethod'];
    case 'campaignSlug':
      return ['campaignsGet'];
    case 'clientSlug':
      return getOperationsForResource('reports');
    case 'currencyCode':
      return ['utilitiesGetCurrency'];
    case 'payloadJson':
      return getOperationsWithBody();
    case 'queryJson':
      return OPERATION_DEFINITIONS.filter(
        (operation) =>
          operation.method === 'GET' || operation.requiresQueryKeys !== undefined,
      ).map((operation) => operation.value);
    case 'redemptionRequestId':
      return [
        'redemptionRequestsGet',
        'redemptionRequestsPatch',
        'redemptionRequestsRedeem',
      ];
    case 'referralId':
      return ['referralsDelete', 'referralsGet', 'referralsPut'];
    case 'referralOriginSlug':
      return ['utilitiesGetReferralOrigin'];
    case 'requestActionSlug':
      return ['utilitiesGetRedemptionRequestAction'];
    case 'requestStatusSlug':
      return ['utilitiesGetRedemptionRequestStatus'];
    case 'traceId':
      return ['bonusesGetTrace'];
    default:
      return [];
  }
}

function assertRequiredQueryKeys(query: IDataObject, requiredKeys: string[]): void {
  const missingKeys = requiredKeys.filter((key) => {
    const value = query[key];
    return value === undefined || value === null || value === '';
  });

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required query fields: ${missingKeys.join(', ')}. Populate them in Query JSON.`,
    );
  }
}

function buildClientSlugQuery(parameters: GeniusReferralsNodeParameters): IDataObject {
  const clientSlug = cleanString(parameters.clientSlug);

  return clientSlug === undefined ? {} : { client_slug: clientSlug };
}

function buildOperationsByResource(): Record<
  GeniusReferralsResource,
  Array<{ description: string; name: string; value: string }>
> {
  const grouped = {} as Record<
    GeniusReferralsResource,
    Array<{ description: string; name: string; value: string }>
  >;

  for (const resource of Object.keys(RESOURCE_LABELS) as GeniusReferralsResource[]) {
    grouped[resource] = OPERATION_DEFINITIONS.filter((operation) => operation.resource === resource)
      .map((operation) => ({
        description: operation.description,
        name: operation.name,
        value: operation.value,
      }));
  }

  return grouped;
}

function buildRequestBody(
  strategy: 'raw' | 'wrapped',
  wrapperKey: string | undefined,
  payloadValue: IDataObject | string | undefined,
  node: INode,
): IDataObject {
  if (payloadValue === undefined) {
    throw new Error('Payload JSON must contain a JSON object.');
  }

  const payload = parseRequiredDataObject(payloadValue, 'Payload JSON', node);

  if (strategy === 'raw') {
    return payload;
  }

  if (wrapperKey === undefined) {
    throw new Error('Missing body wrapper key for wrapped operation.');
  }

  const existingWrapper = payload[wrapperKey];

  if (
    Object.keys(payload).length === 1 &&
    existingWrapper !== undefined &&
    typeof existingWrapper === 'object' &&
    existingWrapper !== null &&
    !Array.isArray(existingWrapper)
  ) {
    return payload;
  }

  return {
    [wrapperKey]: payload,
  };
}

function cleanString(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue === undefined || normalizedValue === '' ? undefined : normalizedValue;
}

function encodePathParameter(value: string | undefined, label: string): string {
  const normalizedValue = cleanString(value);

  if (normalizedValue === undefined) {
    throw new Error(`${label} is required for this operation.`);
  }

  return encodeURIComponent(normalizedValue);
}

function getOperationDefinition(operationValue: string): GeniusReferralsOperationDefinition {
  const definition = OPERATION_BY_VALUE.get(operationValue);

  if (definition === undefined) {
    throw new Error(`Unsupported Genius Referrals operation: ${operationValue}`);
  }

  return definition;
}

function parseOptionalDataObject(
  value: IDataObject | string | undefined,
  fieldName: string,
  node: INode,
): IDataObject {
  if (value === undefined) {
    return {};
  }

  if (typeof value === 'string' && value.trim() === '') {
    return {};
  }

  return parseRequiredDataObject(value, fieldName, node);
}

function parseRequiredDataObject(
  value: IDataObject | string,
  fieldName: string,
  node: INode,
): IDataObject {
  if (typeof value === 'string') {
    try {
      const parsedValue = JSON.parse(value);
      return ensureDataObject(parsedValue, fieldName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
      throw new NodeApiError(node, {
        message: `${fieldName} must be valid JSON. ${message}`,
      } as JsonObject);
    }
  }

  return ensureDataObject(value, fieldName);
}

function ensureDataObject(value: unknown, fieldName: string): IDataObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must contain a JSON object.`);
  }

  return value as IDataObject;
}

const GENIUS_REFERRALS_VALIDATION_NODE: INode = {
  id: 'genius-referrals-validation',
  name: 'Genius Referrals',
  type: 'n8n-nodes-genius-referrals.geniusReferrals',
  typeVersion: 1,
  position: [0, 0],
  parameters: {},
};

const OPERATION_PROPERTIES: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'accountsGetAll',
    displayOptions: {
      show: {
        resource: ['accounts'],
      },
    },
    noDataExpression: true,
    options: GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.accounts,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'advocatesDeleteAll',
    displayOptions: {
      show: {
        resource: ['advocates'],
      },
    },
    noDataExpression: true,
    options: GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.advocates,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'bonusesGetAll',
    displayOptions: {
      show: {
        resource: ['bonuses'],
      },
    },
    noDataExpression: true,
    options: GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.bonuses,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'campaignsGetAll',
    displayOptions: {
      show: {
        resource: ['campaigns'],
      },
    },
    noDataExpression: true,
    options: GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.campaigns,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'redemptionRequestsGetAll',
    displayOptions: {
      show: {
        resource: ['redemptionRequests'],
      },
    },
    noDataExpression: true,
    options: GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.redemptionRequests,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'referralsGetAll',
    displayOptions: {
      show: {
        resource: ['referrals'],
      },
    },
    noDataExpression: true,
    options: GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.referrals,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'reportsRevenue',
    displayOptions: {
      show: {
        resource: ['reports'],
      },
    },
    noDataExpression: true,
    options: GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.reports,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'utilitiesTestAuthentication',
    displayOptions: {
      show: {
        resource: ['utilities'],
      },
    },
    noDataExpression: true,
    options: GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.utilities,
  },
];
