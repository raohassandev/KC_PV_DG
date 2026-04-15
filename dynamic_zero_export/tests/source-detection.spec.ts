import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSource } from '../runtime/source-detection';

test('source detection handles grid, generator, none and stale', () => {
  assert.equal(detectSource({ kw: -5, stale: false }), 'GRID');
  assert.equal(detectSource({ kw: 5, stale: false }), 'GENERATOR');
  assert.equal(detectSource({ kw: 0, stale: false }), 'NONE');
  assert.equal(detectSource({ kw: 0, stale: true }), 'AMBIGUOUS');
});

