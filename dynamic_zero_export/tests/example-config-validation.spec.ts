import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSiteConfig, validateSiteConfig } from '../runtime/site-config';
import { defaultDynamicZeroExportConfig } from '../schema/site-config.types';
import fs from 'node:fs';
import path from 'node:path';

test('example config validates', () => {
  const raw = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'dynamic_zero_export/examples/site-single-grid-gen.json'), 'utf8'),
  );
  const config = loadSiteConfig({
    ...defaultDynamicZeroExportConfig,
    ...raw,
  });
  const result = validateSiteConfig(config);
  assert.equal(result.errors.length, 0);
});

