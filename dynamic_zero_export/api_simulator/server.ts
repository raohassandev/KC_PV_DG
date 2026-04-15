import http from 'node:http';
import { buildSnapshot } from './fixtures';
import { createDeviceServiceRuntime } from './runtime';
import { createDeviceServiceStorage } from './storage';

function json(res: http.ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function createApiServer(port = 8787) {
  const storage = createDeviceServiceStorage();
  const runtime = createDeviceServiceRuntime(storage);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const snapshot = runtime.load();
    if (req.method === 'GET' && (url.pathname === '/api/device/info' || url.pathname === '/api/device')) return json(res, 200, runtime.handlers.getDevice());
    if (req.method === 'GET' && url.pathname === '/api/live-status') return json(res, 200, runtime.handlers.getLiveStatus());
    if (req.method === 'GET' && url.pathname === '/api/topology') return json(res, 200, runtime.handlers.getTopology());
    if (req.method === 'GET' && url.pathname === '/api/connectivity') return json(res, 200, runtime.handlers.getConnectivity());
    if (req.method === 'GET' && url.pathname === '/api/alerts') return json(res, 200, runtime.handlers.getAlerts());
    if (req.method === 'GET' && url.pathname === '/api/history') return json(res, 200, runtime.handlers.getHistory());
    if (req.method === 'GET' && url.pathname === '/api/commissioning-summary') return json(res, 200, runtime.handlers.getCommissioning());
    if (req.method === 'GET' && url.pathname === '/api/config-review') return json(res, 200, runtime.handlers.getConfigReview());
    if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, runtime.handlers.getSession());
    if (req.method === 'GET' && url.pathname === '/api/snapshot') return json(res, 200, snapshot);
    if (req.method === 'POST' && url.pathname === '/api/connectivity/settings') return readBody(req).then((body) => json(res, 200, runtime.handlers.postConnectivitySettings(body)));
    if (req.method === 'POST' && url.pathname === '/api/provider-mode') return readBody(req).then((body) => json(res, 200, runtime.handlers.postProviderMode(body)));
    if (req.method === 'POST' && url.pathname === '/api/alerts/ack') return readBody(req).then((body) => json(res, 200, runtime.handlers.postAlertAck(body)));
    if (req.method === 'POST' && url.pathname === '/api/sim/live-status') return readBody(req).then((body) => json(res, 200, runtime.handlers.postSimLiveStatus(body)));
    if (req.method === 'POST' && url.pathname === '/api/sim/connectivity') return readBody(req).then((body) => json(res, 200, runtime.handlers.postSimConnectivity(body)));
    if (req.method === 'POST' && url.pathname === '/api/sim/alerts') return readBody(req).then((body) => json(res, 200, runtime.handlers.postSimAlerts(body)));
    if (req.method === 'POST' && url.pathname === '/api/sim/history-append') return readBody(req).then((body) => json(res, 200, runtime.handlers.postSimHistoryAppend(body)));
    json(res, 404, { error: 'not_found' });
  });
  return {
    server,
    listen() {
      return new Promise<http.Server>((resolve) => {
        server.listen(port, () => resolve(server));
      });
    },
  };
}

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve({});
      }
    });
  });
}
