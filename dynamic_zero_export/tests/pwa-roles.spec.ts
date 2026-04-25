import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPage, canEditField, getPermissions } from '../pwa/permissions';

test('role permissions expose expected visibility', () => {
  assert.ok(getPermissions('user').visiblePages.includes('energy-history'));
  assert.ok(getPermissions('user').visiblePages.includes('reliability'));
  assert.ok(!getPermissions('user').visiblePages.includes('connectivity'));
  assert.ok(getPermissions('installer').visiblePages.includes('commissioning'));
  assert.ok(getPermissions('manufacturer').visiblePages.includes('support-bundle'));
});

test('role permission mapping restricts access', () => {
  assert.equal(canAccessPage('user', 'reliability'), true);
  assert.equal(canAccessPage('user', 'power-flow'), false);
  assert.equal(canAccessPage('user', 'connectivity'), false);
  assert.equal(canAccessPage('user', 'commissioning'), false);
  assert.equal(canAccessPage('installer', 'commissioning'), true);
  assert.equal(canEditField('user', 'policy.gridMode'), false);
  assert.equal(canEditField('installer', 'policy.gridMode'), true);
  assert.equal(canEditField('manufacturer', 'any.field.path'), true);
});

