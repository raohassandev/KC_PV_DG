import { createApiServer } from './server';

const port = Number(process.env.PORT || 8787);
const { server, listen } = createApiServer(port);

await listen();
console.log(`Dynamic Zero Export API simulator listening on http://127.0.0.1:${port}`);

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
