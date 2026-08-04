const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE,
} = require('../dist/nodes/GeniusReferrals/GeniusReferrals.operation.js');

const workflowPath = path.join(
  __dirname,
  '..',
  'docs',
  'demo-workflows',
  'creator-portal-demo-0.1.3.json',
);

test('Creator Portal demo workflow uses approved Genius Referrals operations', () => {
  const workflow = readWorkflow();
  const geniusReferralsNodes = workflow.nodes.filter(
    (node) => node.type === 'n8n-nodes-genius-referrals.geniusReferrals',
  );

  assert.equal(workflow.name, 'Genius Referrals Creator Portal Demo 0.1.3');
  assert.equal(workflow.active, false);
  assert.equal(geniusReferralsNodes.length, 5);

  for (const node of geniusReferralsNodes) {
    const { operation, resource } = node.parameters;
    const allowedOperations = GENIUS_REFERRALS_OPERATION_OPTIONS_BY_RESOURCE[resource].map(
      (entry) => entry.value,
    );

    assert.match(node.name, /^GR - /);
    assert.ok(allowedOperations.includes(operation), `${node.name} uses ${resource}.${operation}`);
  }
});

test('Creator Portal demo workflow keeps credentials as placeholders only', () => {
  const workflow = readWorkflow();
  const serializedWorkflow = JSON.stringify(workflow);
  const geniusReferralsNodes = workflow.nodes.filter(
    (node) => node.type === 'n8n-nodes-genius-referrals.geniusReferrals',
  );

  assert.equal(serializedWorkflow.includes('X-Auth-Token'), false);
  assert.equal(serializedWorkflow.includes('apiToken'), false);
  assert.equal(serializedWorkflow.includes('accessToken'), false);
  assert.equal(serializedWorkflow.includes('bearer'), false);

  for (const node of geniusReferralsNodes) {
    assert.deepEqual(node.credentials, {
      geniusReferralsApi: {
        id: '__SET_IN_N8N__',
        name: 'Genius Referrals API - Demo',
      },
    });
  }
});

test('Creator Portal demo workflow covers the prepared recording path', () => {
  const workflow = readWorkflow();

  assert.deepEqual(
    workflow.nodes
      .filter((node) => node.type === 'n8n-nodes-genius-referrals.geniusReferrals')
      .map((node) => node.parameters.operation),
    [
      'utilitiesTestAuthentication',
      'accountsGetAll',
      'utilitiesGetCurrencies',
      'advocatesGetAll',
      'reportsRevenue',
    ],
  );
});

function readWorkflow() {
  return JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
}
