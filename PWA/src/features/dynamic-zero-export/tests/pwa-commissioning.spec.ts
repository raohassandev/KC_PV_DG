import test from 'node:test';
import assert from 'node:assert/strict';
import { commissioningExample, configReviewExample } from '../../../../../dynamic_zero_export/api_contract/examples';
import { mapCommissioningApiToModel } from '../view-models/commissioning';

test('map commissioning API payload into installer view model', () => {
  const model = mapCommissioningApiToModel(commissioningExample, 'installer', configReviewExample);
  assert.equal(model.siteName, 'Example site');
  assert.equal(model.role, 'installer');
  assert.ok(model.cards.length >= 4);
  assert.equal(model.configState, 'validated');
  assert.ok(model.reviewLines?.includes('Topology OK'));
  assert.equal(model.configReview?.valid, true);
});
