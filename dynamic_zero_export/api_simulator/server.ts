import http from 'node:http';
import { buildSnapshot } from './fixtures';

function json(res: http.ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function createApiServer(port = 8787) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const snapshot = buildSnapshot();
    if (req.method === 'GET' && url.pathname === '/api/device') return json(res, 200, snapshot.device);
    if (req.method === 'GET' && url.pathname === '/api/live-status') return json(res, 200, snapshot.live);
    if (req.method === 'GET' && url.pathname === '/api/topology') return json(res, 200, snapshot.topology);
    if (req.method === 'GET' && url.pathname === '/api/connectivity') return json(res, 200, snapshot.connectivity);
    if (req.method === 'GET' && url.pathname === '/api/alerts') return json(res, 200, snapshot.alerts);
    if (req.method === 'GET' && url.pathname === '/api/history') return json(res, 200, snapshot.history);
    if (req.method === 'GET' && url.pathname === '/api/commissioning') return json(res, 200, snapshot.commissioning);
    if (req.method === 'GET' && url.pathname === '/api/config-review') return json(res, 200, snapshot.configReview);
    if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, snapshot.session);
    if (req.method === 'GET' && url.pathname === '/api/snapshot') return json(res, 200, snapshot);
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
