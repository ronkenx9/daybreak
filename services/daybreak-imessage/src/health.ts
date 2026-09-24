import { createServer, type Server } from 'node:http';

export function startHealthServer(port: number, ready: () => boolean): Server {
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || !['/healthz', '/readyz'].includes(request.url ?? '')) {
      response.writeHead(404, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ ok: false }));
      return;
    }
    const isReady = ready();
    const readinessProbe = request.url === '/readyz';
    response.writeHead(readinessProbe && !isReady ? 503 : 200, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify({ ok: readinessProbe ? isReady : true, ready: isReady }));
  });
  server.listen(port, '0.0.0.0');
  return server;
}
