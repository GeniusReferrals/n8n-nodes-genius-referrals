'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { NodeApiError } = require('n8n-workflow');
const {
  GENIUS_REFERRALS_API_CREDENTIAL_TYPE,
} = require('../dist/lib/client/GeniusReferralsApiClient.js');
const { GeniusReferrals } = require('../dist/nodes/GeniusReferrals/GeniusReferrals.node.js');

const TEST_NODE = {
  id: 'node-1',
  name: 'Genius Referrals',
  type: 'n8n-nodes-genius-referrals.geniusReferrals',
  typeVersion: 1,
  position: [0, 0],
  parameters: {},
};

test('standard node execution sends an authenticated Genius Referrals API request', async () => {
  const calls = [];
  const context = createExecuteContext({
    getNode: () => TEST_NODE,
    async httpRequestWithAuthentication(credentialType, requestOptions) {
      calls.push({ credentialType, requestOptions });

      return {
        data: {
          ok: true,
        },
      };
    },
  });

  const result = await new GeniusReferrals().execute.call(context);

  assert.deepEqual(result, [
    [
      {
        json: {
          ok: true,
        },
        pairedItem: {
          item: 0,
        },
      },
    ],
  ]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].credentialType, GENIUS_REFERRALS_API_CREDENTIAL_TYPE);
  assert.equal(calls[0].requestOptions.method, 'GET');
  assert.equal(calls[0].requestOptions.url, 'https://api.example.test/test-authentication');
});

test('dynamic load-options methods use the authenticated API client', async () => {
  const calls = [];
  const context = createLoadOptionsContext({
    async httpRequestWithAuthentication(credentialType, requestOptions) {
      calls.push({ credentialType, requestOptions });

      return {
        data: {
          results: [
            {
              name: 'Acme Rewards',
              slug: 'acme-rewards',
            },
          ],
        },
      };
    },
  });

  const options = await new GeniusReferrals().methods.loadOptions.getAccounts.call(context);

  assert.deepEqual(options, [
    {
      name: 'Acme Rewards',
      value: 'acme-rewards',
    },
  ]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].credentialType, GENIUS_REFERRALS_API_CREDENTIAL_TYPE);
  assert.equal(calls[0].requestOptions.url, 'https://api.example.test/accounts');
});

test('AI Agent tool execution works when the context omits getNode', async () => {
  const calls = [];
  const context = createExecuteContext({
    getNode: undefined,
    async httpRequestWithAuthentication(credentialType, requestOptions) {
      calls.push({ credentialType, requestOptions });

      return {
        data: {
          agentTool: true,
        },
      };
    },
  });

  const result = await new GeniusReferrals().execute.call(context);

  assert.deepEqual(result[0][0], {
    json: {
      agentTool: true,
    },
    pairedItem: {
      item: 0,
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].requestOptions.url, 'https://api.example.test/test-authentication');
});

test('AI Agent tool execution falls back when getNode is not callable', async () => {
  const calls = [];
  const context = createExecuteContext({
    getNode: 'not-a-function',
    async httpRequestWithAuthentication(credentialType, requestOptions) {
      calls.push({ credentialType, requestOptions });

      return {
        data: {
          agentTool: true,
        },
      };
    },
  });

  const result = await new GeniusReferrals().execute.call(context);

  assert.deepEqual(result[0][0], {
    json: {
      agentTool: true,
    },
    pairedItem: {
      item: 0,
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].requestOptions.url, 'https://api.example.test/test-authentication');
});

test('AI Agent tool API failures are reported as NodeApiError instead of getNode TypeError', async () => {
  const context = createExecuteContext({
    getNode: undefined,
    async httpRequestWithAuthentication() {
      throw {
        response: {
          statusCode: 401,
          body: {
            code: 'invalid_api_token',
            message: 'Invalid Genius Referrals API token',
          },
        },
      };
    },
  });

  await assert.rejects(
    () => new GeniusReferrals().execute.call(context),
    (error) => {
      assert.equal(error instanceof NodeApiError, true);
      assert.equal(error.constructor.name, 'NodeApiError');
      assert.equal(error.message, 'Invalid Genius Referrals API token');
      assert.equal(error.httpCode, '401');
      assert.equal(error.context.itemIndex, 0);
      assert.doesNotMatch(error.message, /getNode/);

      return true;
    },
  );
});

function createExecuteContext({
  continueOnFail = false,
  getNode = () => TEST_NODE,
  httpRequestWithAuthentication,
  parameters = {},
}) {
  const context = {
    async getCredentials(name) {
      assert.equal(name, GENIUS_REFERRALS_API_CREDENTIAL_TYPE);

      return {
        apiToken: 'test-token',
        baseUrl: 'https://api.example.test',
      };
    },
    helpers: {
      httpRequestWithAuthentication,
    },
    continueOnFail() {
      return continueOnFail;
    },
    getInputData() {
      return [
        {
          json: {
            input: true,
          },
        },
      ];
    },
    getNodeParameter(name) {
      const values = {
        payloadJson: '{}',
        queryJson: '{}',
        operation: 'utilitiesTestAuthentication',
        resource: 'utilities',
        ...parameters,
      };

      return values[name] ?? '';
    },
  };

  if (getNode !== undefined) {
    context.getNode = getNode;
  }

  return context;
}

function createLoadOptionsContext({ httpRequestWithAuthentication }) {
  return {
    async getCredentials(name) {
      assert.equal(name, GENIUS_REFERRALS_API_CREDENTIAL_TYPE);

      return {
        apiToken: 'test-token',
        baseUrl: 'https://api.example.test',
      };
    },
    helpers: {
      httpRequestWithAuthentication,
    },
    getCurrentNodeParameter() {
      return undefined;
    },
  };
}
