const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildGeniusReferralsRequestDefinition,
  createOperationProperties,
  GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE,
  GENIUS_REFERRALS_RESOURCE_OPTIONS,
} = require('../dist/nodes/GeniusReferrals/GeniusReferrals.operation.js');

test('resource options expose the approved top-level resource families', () => {
  assert.deepEqual(
    GENIUS_REFERRALS_RESOURCE_OPTIONS.map((entry) => entry.value),
    [
      'accounts',
      'advocates',
      'bonuses',
      'campaigns',
      'redemptionRequests',
      'referrals',
      'reports',
      'utilities',
    ],
  );
});

test('operation options expose the main approved resource coverage', () => {
  assert.equal(
    GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.advocates.some(
      (entry) => entry.value === 'advocatesCreate',
    ),
    true,
  );
  assert.equal(
    GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.referrals.some(
      (entry) => entry.value === 'referralsPut',
    ),
    true,
  );
  assert.equal(
    GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE.reports.some(
      (entry) => entry.value === 'reportsTopAdvocates',
    ),
    true,
  );
});

test('operation properties expose scanner-compliant resource defaults', () => {
  const properties = createOperationProperties();

  assert.deepEqual(
    properties.map((property) => [property.displayOptions.show.resource[0], property.default]),
    [
      ['accounts', 'accountsGetAll'],
      ['advocates', 'advocatesDeleteAll'],
      ['bonuses', 'bonusesGetAll'],
      ['campaigns', 'campaignsGetAll'],
      ['redemptionRequests', 'redemptionRequestsGetAll'],
      ['referrals', 'referralsGetAll'],
      ['reports', 'reportsRevenue'],
      ['utilities', 'utilitiesTestAuthentication'],
    ],
  );
});

test('wrapped advocate create requests apply the advocate root key automatically', () => {
  const request = buildGeniusReferralsRequestDefinition({
    accountSlug: 'acme',
    operation: 'advocatesCreate',
    payloadJson: {
      firstname: 'Ada',
      lastname: 'Lovelace',
    },
    resource: 'advocates',
  });

  assert.equal(request.method, 'POST');
  assert.equal(request.endpoint, '/accounts/acme/advocates');
  assert.deepEqual(request.body, {
    advocate: {
      firstname: 'Ada',
      lastname: 'Lovelace',
    },
  });
});

test('wrapped payloads are preserved when the user already supplies the expected root key', () => {
  const request = buildGeniusReferralsRequestDefinition({
    accountSlug: 'acme',
    operation: 'referralsCreate',
    payloadJson: {
      referral: {
        referred_advocate_token: 'ref-1',
      },
    },
    resource: 'referrals',
    advocateToken: 'adv-1',
  });

  assert.deepEqual(request.body, {
    referral: {
      referred_advocate_token: 'ref-1',
    },
  });
});

test('patch operations keep the flat payload shape expected by the GR API', () => {
  const request = buildGeniusReferralsRequestDefinition({
    accountSlug: 'acme',
    bonusId: '44',
    operation: 'bonusesPatch',
    payloadJson: {
      status: 'denied',
      reason: 'manual review',
    },
    resource: 'bonuses',
  });

  assert.equal(request.method, 'PATCH');
  assert.equal(request.endpoint, '/accounts/acme/bonuses/44');
  assert.deepEqual(request.body, {
    status: 'denied',
    reason: 'manual review',
  });
});

test('report operations merge client_slug into the query string automatically', () => {
  const request = buildGeniusReferralsRequestDefinition({
    clientSlug: 'acme',
    operation: 'reportsRevenue',
    queryJson: {
      from: '2026-01-01',
      to: '2026-01-31',
    },
    resource: 'reports',
  });

  assert.equal(request.method, 'GET');
  assert.equal(request.endpoint, '/reports/revenue');
  assert.deepEqual(request.qs, {
    client_slug: 'acme',
    from: '2026-01-01',
    to: '2026-01-31',
  });
});

test('bonus checkup requires the documented query fields', () => {
  assert.throws(
    () =>
      buildGeniusReferralsRequestDefinition({
        accountSlug: 'acme',
        operation: 'bonusesCheckup',
        queryJson: {
          advocate_token: 'adv-1',
        },
        resource: 'bonuses',
      }),
    /Missing required query fields: reference, payment_amount, campaign_slug/,
  );
});

test('json fields reject invalid payload strings with a clear error', () => {
  assert.throws(
    () =>
      buildGeniusReferralsRequestDefinition({
        accountSlug: 'acme',
        operation: 'redemptionRequestsCreate',
        payloadJson: '{"broken"',
        resource: 'redemptionRequests',
      }),
    (error) => error.constructor.name === 'NodeApiError' && /Payload JSON must be valid JSON/.test(error.message),
  );
});
