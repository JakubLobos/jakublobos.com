// Node stand-in for `wrangler dev` (workerd crashes on the owner's Windows build): serves
// apps/web/dist with Cloudflare static-assets semantics and runs the real Worker code.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import worker from '../worker/index.ts';
import { createEdge } from './edge.ts';

const { values } = parseArgs({ options: { port: { type: 'string', default: '8787' } } });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('--port must be an integer between 1 and 65535');
}

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const edge = createEdge({
  distDir: `${webRoot}dist`,
  wranglerConfigPath: `${webRoot}wrangler.jsonc`,
  worker,
});

const server = createServer((req, res) => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(name, value);
    else if (value !== undefined) for (const v of value) headers.append(name, v);
  }
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `localhost:${port}`}`);
  edge(new Request(url, { method: req.method ?? 'GET', headers }))
    .then(async (response) => {
      // Headers iteration joins Set-Cookie values; Node needs them as separate headers.
      const out: Record<string, string | string[]> = Object.fromEntries(response.headers);
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) out['set-cookie'] = cookies;
      res.writeHead(response.status, out);
      res.end(Buffer.from(await response.arrayBuffer()));
    })
    .catch((error: unknown) => {
      // Local tool: surface the cause instead of a bare 500.
      console.error(error);
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    });
});

// Loopback only: this is a local preview, not something to expose on the LAN.
server.listen(port, '127.0.0.1', () => {
  console.log(`edge emulator listening on http://localhost:${port}`);
});
