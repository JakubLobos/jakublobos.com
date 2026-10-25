import { Router } from 'express';
import { Writable } from 'node:stream';
import { createApp, type AppDeps } from '../app.ts';
import { createSequentialIds } from '../domain/shared/ids.ts';
import { createLogger } from '../logger.ts';
import { jsonBody } from '../http/middleware/require-json.ts';
import { createClientLimiter } from '../http/rate-limit.ts';
import { ok } from '../http/respond.ts';
import type { RouteModule } from '../http/route-module.ts';
import type { ClientIpSource } from '../http/client-ip.ts';

export const ALLOWED_ORIGIN = 'http://localhost:4321';

export function createLogCapture(): { stream: Writable; text: () => string } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk.toString('utf8'));
      callback();
    },
  });
  return { stream, text: () => chunks.join('') };
}

/** Minimal routes exercising the pipeline: body parsing, limiting and the 500 path. */
export function createProbeRoutes(options: {
  clientIpSource: ClientIpSource;
  limit?: number;
}): RouteModule {
  const router = Router();
  const limiter = createClientLimiter({
    windowMs: 60_000,
    limit: options.limit ?? 1000,
    clientIpSource: options.clientIpSource,
  });
  router.post('/echo', limiter, ...jsonBody('1kb'), (_req, res) => {
    ok(res, { received: true });
  });
  router.get('/boom', () => {
    throw new Error('kaboom');
  });
  return { mountPath: '/api', router };
}

/** `clientIpSource` and `limit` configure the probe route's limiter; they are not app deps. */
export function buildTestApp(
  overrides: Partial<AppDeps> & { limit?: number; clientIpSource?: ClientIpSource } = {},
) {
  const { limit, clientIpSource: ipSource, ...depOverrides } = overrides;
  const capture = createLogCapture();
  const clientIpSource = ipSource ?? 'socket';
  const app = createApp({
    logger: createLogger({ level: 'info', destination: capture.stream }),
    ids: createSequentialIds('req-test'),
    isProduction: false,
    corsAllowedOrigins: [ALLOWED_ORIGIN],
    routes: [createProbeRoutes({ clientIpSource, limit })],
    ...depOverrides,
  });
  return { app, logs: capture.text };
}
