import test from 'node:test';
import assert from 'node:assert/strict';
import { getBrandProfile, listBrandProfiles } from '../adapters/registry';

test('brand registry returns known profiles', () => {
  const profiles = listBrandProfiles();
  assert.ok(profiles.length >= 4);
  assert.ok(getBrandProfile('huawei-default'));
  assert.ok(getBrandProfile('goodwe-default'));
  assert.ok(getBrandProfile('growatt-default'));
  assert.ok(getBrandProfile('solis-default'));
});

