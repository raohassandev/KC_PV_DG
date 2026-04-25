import test from 'node:test';
import assert from 'node:assert/strict';
import { featureNavigationByRole } from '../navigation';
import { buildFeatureRoutes } from '../routes';
import { ProductArea } from '../ProductArea';

test('user navigation hides commissioning pages', () => {
  const ids = featureNavigationByRole.user.map((item) => item.id);
  assert.ok(ids.includes('energy-history'));
  assert.ok(ids.includes('reliability'));
  assert.ok(!ids.includes('overview'));
  assert.ok(!ids.includes('connectivity'));
  assert.ok(!ids.includes('alerts'));
  assert.ok(!ids.includes('commissioning'));
  assert.ok(!ids.includes('diagnostics'));
});

test('installer routes include diagnostics and commissioning', () => {
  const routes = buildFeatureRoutes('installer');
  const ids = routes.map((route) => route.id);
  assert.ok(ids.includes('commissioning'));
  assert.ok(ids.includes('diagnostics'));
});

test('feature area component is loadable', () => {
  assert.equal(typeof ProductArea, 'function');
});
