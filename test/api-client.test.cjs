const test = require('node:test');
const assert = require('node:assert/strict');

const {
  GENIUS_REFERRALS_API_CREDENTIAL_TYPE,
  buildGeniusReferralsRequestOptions,
  createGeniusReferralsApiClient,
  getGeniusReferralsApiCredentials,
  grApiRequest,
  grApiRequestWithAuthentication,
  isGeniusReferralsApiError,
} = require('../dist/index.js');
const {
  GeniusReferralsApiError,
  toGeniusReferralsApiError,
} = require('../dist/lib/errors/GeniusReferralsApiError.js');

test('buildGeniusReferralsRequestOptions normalizes URL and JSON body headers', () => {
  const requestOptions = buildGeniusReferralsRequestOptions({
    baseUrl: 'https://api.geniusreferrals.com/',
    body: { advocate: { email: 'ada@example.com' } },
    endpoint: '/advocates',
    method: 'POST',
    qs: { page: 2 },
  });

  assert.equal(requestOptions.url, 'https://api.geniusreferrals.com/advocates');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.json, true);
  assert.deepEqual(requestOptions.qs, { page: 2 });
  assert.equal(requestOptions.headers.Accept, 'application/json');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
});

test('buildGeniusReferralsRequestOptions preserves base URL when endpoint is empty', () => {
  const requestOptions = buildGeniusReferralsRequestOptions({
    baseUrl: 'https://api.geniusreferrals.com/',
    endpoint: '',
  });

  assert.equal(requestOptions.url, 'https://api.geniusreferrals.com');
  assert.equal(requestOptions.headers.Accept, 'application/json');
  assert.equal(requestOptions.headers['Content-Type'], undefined);
});

test('grApiRequestWithAuthentication delegates with the default credential type', async () => {
  const calls = [];
  const result = await grApiRequestWithAuthentication(
    async (credentialType, requestOptions) => {
      calls.push({ credentialType, requestOptions });

      return { ok: true };
    },
    {
      endpoint: '/test-authentication',
      method: 'GET',
      returnFullResponse: true,
    },
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].credentialType, GENIUS_REFERRALS_API_CREDENTIAL_TYPE);
  assert.equal(calls[0].requestOptions.url, 'https://api.geniusreferrals.com/test-authentication');
  assert.equal(calls[0].requestOptions.returnFullResponse, true);
});

test('getGeniusReferralsApiCredentials normalizes credential base URL and falls back when blank', async () => {
  const normalizedCredentials = await getGeniusReferralsApiCredentials({
    async getCredentials(name) {
      assert.equal(name, GENIUS_REFERRALS_API_CREDENTIAL_TYPE);

      return {
        apiToken: 'secret',
        baseUrl: ' https://api.geniusreferrals.com/custom/ ',
      };
    },
    helpers: {
      async requestWithAuthentication() {
        throw new Error('requestWithAuthentication should not be called');
      },
    },
  });

  assert.equal(normalizedCredentials.apiToken, 'secret');
  assert.equal(normalizedCredentials.baseUrl, 'https://api.geniusreferrals.com/custom');

  const defaultedCredentials = await getGeniusReferralsApiCredentials({
    async getCredentials() {
      return {
        apiToken: 'secret',
        baseUrl: '   ',
      };
    },
    helpers: {
      async requestWithAuthentication() {
        throw new Error('requestWithAuthentication should not be called');
      },
    },
  });

  assert.equal(defaultedCredentials.baseUrl, 'https://api.geniusreferrals.com');
});

test('createGeniusReferralsApiClient binds credential lookup to authenticated requests', async () => {
  const calls = [];
  const client = await createGeniusReferralsApiClient({
    async getCredentials(name) {
      assert.equal(name, GENIUS_REFERRALS_API_CREDENTIAL_TYPE);

      return {
        apiToken: 'secret',
        baseUrl: 'https://api.geniusreferrals.com/api/2.0/',
      };
    },
    helpers: {
      async requestWithAuthentication(credentialType, requestOptions) {
        calls.push({ credentialType, requestOptions });

        return {
          response: 'ok',
        };
      },
    },
  });

  assert.equal(client.credentials.baseUrl, 'https://api.geniusreferrals.com/api/2.0');

  const response = await client.request({
    endpoint: '/advocates',
    method: 'GET',
    qs: { page: 3 },
  });

  assert.deepEqual(response, { response: 'ok' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].credentialType, GENIUS_REFERRALS_API_CREDENTIAL_TYPE);
  assert.equal(calls[0].requestOptions.url, 'https://api.geniusreferrals.com/api/2.0/advocates');
  assert.deepEqual(calls[0].requestOptions.qs, { page: 3 });
});

test('createGeniusReferralsApiClient preserves shared error mapping and allows request base URL overrides', async () => {
  const client = await createGeniusReferralsApiClient({
    async getCredentials() {
      return {
        apiToken: 'secret',
        baseUrl: 'https://api.geniusreferrals.com/api/2.0/',
      };
    },
    helpers: {
      async requestWithAuthentication() {
        throw {
          response: {
            statusCode: 404,
            body: {
              code: 'missing_resource',
              message: 'Advocate was not found',
            },
          },
        };
      },
    },
  });

  await assert.rejects(
    () =>
      client.request({
        baseUrl: 'https://sandbox.geniusreferrals.com/v1/',
        endpoint: '/advocates/123',
        method: 'GET',
      }),
    (error) => {
      assert.equal(error instanceof GeniusReferralsApiError, true);
      assert.equal(error.message, 'Advocate was not found');
      assert.equal(error.statusCode, 404);
      assert.equal(error.apiCode, 'missing_resource');
      assert.equal(error.endpoint, 'https://sandbox.geniusreferrals.com/v1/advocates/123');

      return true;
    },
  );
});

test('grApiRequest normalizes API validation details into GeniusReferralsApiError', async () => {
  await assert.rejects(
    () =>
      grApiRequest(
        async () => {
          throw {
            response: {
              statusCode: 422,
              body: {
                code: 'validation_error',
                details: {
                  email: ['This field is required.'],
                },
                message: 'Invalid advocate payload',
              },
            },
          };
        },
        {
          body: { advocate: {} },
          endpoint: '/advocates',
          method: 'POST',
        },
      ),
    (error) => {
      assert.equal(isGeniusReferralsApiError(error), true);
      assert.equal(error instanceof GeniusReferralsApiError, true);
      assert.equal(error.message, 'Invalid advocate payload');
      assert.equal(error.statusCode, 422);
      assert.equal(error.apiCode, 'validation_error');
      assert.deepEqual(error.details, {
        email: ['This field is required.'],
      });
      assert.equal(error.endpoint, 'https://api.geniusreferrals.com/advocates');
      assert.equal(error.method, 'POST');

      return true;
    },
  );
});

test('toGeniusReferralsApiError falls back to transport error details when no API body exists', () => {
  const error = toGeniusReferralsApiError(
    {
      message: 'socket hang up',
      statusCode: 503,
    },
    {
      method: 'GET',
      url: 'https://api.geniusreferrals.com/advocates',
    },
  );

  assert.equal(error.message, 'socket hang up');
  assert.equal(error.statusCode, 503);
  assert.equal(error.apiCode, undefined);
  assert.equal(error.responseBody, undefined);
});
