import { createServer, type RequestListener, type Server } from 'node:http';

export const SERVER_TIMEOUTS = {
  headersTimeoutMs: 15_000,
  requestTimeoutMs: 20_000,
  keepAliveTimeoutMs: 5_000,
  // Node only checks header/request timeouts on this interval (default 30 s), so without
  // lowering it the 15 s limit would really fire after ~30 s.
  connectionsCheckingIntervalMs: 5_000,
} as const;

/** HTTP server with slow-loris and stuck-client limits (docs/security.md T15). */
export function createHttpServer(listener: RequestListener): Server {
  const server = createServer(
    { connectionsCheckingInterval: SERVER_TIMEOUTS.connectionsCheckingIntervalMs },
    listener,
  );
  server.headersTimeout = SERVER_TIMEOUTS.headersTimeoutMs;
  server.requestTimeout = SERVER_TIMEOUTS.requestTimeoutMs;
  server.keepAliveTimeout = SERVER_TIMEOUTS.keepAliveTimeoutMs;
  return server;
}
