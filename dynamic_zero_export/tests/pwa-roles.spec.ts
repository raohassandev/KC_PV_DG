import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPage, canEditField, getPermissions } from '../pwa/permissions';

test('role permissions expose expected visibility', () => {
  assert.ok(getPermissions('user').visiblePages.includes('overview'));
  assert.ok(getPermissions('installer').visiblePages.includes('commissioning'));
  assert.ok(getPermissions('manufacturer').visiblePages.includes('support-bundle'));
});

test('role permission mapping restricts access', () => {
  assert.equal(canAccessPage('user', 'commissioning'), false);
  assert.equal(canAccessPage('installer', 'commissioning'), true);
  assert.equal(canEditField('user', 'policy.gridMode'), false);
  assert.equal(canEditField('installer', 'policy.gridMode'), true);
  assert.equal(canEditField('manufacturer', 'any.field.path'), true);
});

