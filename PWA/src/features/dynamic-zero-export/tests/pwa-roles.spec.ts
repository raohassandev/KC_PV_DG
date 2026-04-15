import test from 'node:test';
import assert from 'node:assert/strict';
import { rolePermissions, resolveRole } from '../roles';

test('resolves role safely', () => {
  assert.equal(resolveRole('installer'), 'installer');
  assert.equal(resolveRole('manufacturer'), 'manufacturer');
  assert.equal(resolveRole('unknown'), 'user');
});

test('manufacturer can see deeper pages than user', () => {
  assert.ok(rolePermissions.manufacturer.visiblePages.includes('support-bundle'));
  assert.ok(!rolePermissions.user.visiblePages.includes('support-bundle'));
});

