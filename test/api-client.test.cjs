const test = require('node:test');
const assert = require('node:assert/strict');

const {
  GENIUS_REFERRALS_API_CREDENTIAL_TYPE,
  buildGeniusReferralsRequestOptions,
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
