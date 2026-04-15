import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoutes } from '../pwa/routes';
import { visibleNavigation } from '../pwa/navigation';

test('navigation visibility differs by role', () => {
  assert.ok(visibleNavigation('user').every((item) => item.audience.includes('user')));
  assert.ok(visibleNavigation('installer').some((item) => item.id === 'commissioning'));
  assert.ok(visibleNavigation('manufacturer').some((item) => item.id === 'support-bundle'));
});

test('routes mirror navigation visibility', () => {
  const installerRoutes = buildRoutes('installer');
  assert.ok(installerRoutes.some((route) => route.pageId === 'commissioning'));
  assert.ok(installerRoutes.every((route) => route.path.startsWith('/')));
});

