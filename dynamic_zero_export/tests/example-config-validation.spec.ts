import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSiteConfig, validateSiteConfig } from '../runtime/site-config';
import { defaultDynamicZeroExportConfig } from '../schema/site-config.types';
import fs from 'node:fs';
import path from 'node:path';

const fixturesDir = path.resolve(process.cwd(), 'examples');

test('example config validates', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'site-single-grid-gen.json'), 'utf8'));
  const config = loadSiteConfig({
    ...defaultDynamicZeroExportConfig,
    ...raw,
  });
  const result = validateSiteConfig(config);
  assert.equal(result.errors.length, 0);
});
