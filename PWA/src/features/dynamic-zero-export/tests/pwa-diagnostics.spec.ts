import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../../../../../dynamic_zero_export/api_simulator';
import { fetchDiagnosticsApiBundle } from '../services/diagnosticsService';

test('diagnostics bundle loads topology and device from monitoring API', async () => {
  const stateDir = mkdtempSync(path.join(tmpdir(), 'dzx-diag-'));
  const sim = createApiServer(8793, stateDir);
  const server = await sim.listen();
  try {
    const bundle = await fetchDiagnosticsApiBundle('api', { baseUrl: 'http://127.0.0.1:8793' });
    assert.equal(bundle.device?.deviceId, 'dzx-001');
    assert.equal(bundle.topology?.topologyType, 'SINGLE_BUS');
    assert.ok(bundle.snapshot?.live);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test('diagnostics bundle is empty when no monitoring API base URL is configured', async () => {
  const bundle = await fetchDiagnosticsApiBundle('auto');
  assert.equal(bundle.device, null);
  assert.equal(bundle.topology, null);
});
