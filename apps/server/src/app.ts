import express, { type Express } from 'express';
import type { Logger } from 'pino';
import type { IdGenerator } from './domain/shared/ids.ts';
import { allowedOrigin } from './http/middleware/allowed-origin.ts';
import { corsAllowlist } from './http/middleware/cors.ts';
import { errorHandler } from './http/middleware/error-handler.ts';
import { notFound } from './http/middleware/not-found.ts';
import { requestId } from './http/middleware/request-id.ts';
import { requestLogger } from './http/middleware/request-logger.ts';
import { securityHeaders } from './http/middleware/security-headers.ts';
import type { RouteModule } from './http/route-module.ts';

export type { RouteModule } from './http/route-module.ts';

export interface AppDeps {
  readonly logger: Logger;
  readonly ids: IdGenerator;
  readonly isProduction: boolean;
  readonly corsAllowedOrigins: readonly string[];
  readonly routes: readonly RouteModule[];
}

/** Builds the Express app without any I/O, so tests can drive it with supertest. */
export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  // `trust proxy` stays off: client IP comes from resolveClientIp, never from req.ip.

  app.use(requestId(deps.ids));
  app.use(requestLogger(deps.logger));
  app.use(securityHeaders({ isProduction: deps.isProduction }));
  app.use(corsAllowlist(deps.corsAllowedOrigins));
  // Checked before any body is read, so a foreign site can't make us parse payloads.
  app.use(allowedOrigin(deps.corsAllowedOrigins));

  for (const route of deps.routes) app.use(route.mountPath, route.router);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
