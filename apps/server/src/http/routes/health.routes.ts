import { Router } from 'express';
import type { RouteModule } from '../route-module.ts';
import { fail, ok } from '../respond.ts';

export interface HealthDeps {
  /** Resolves when the database answers `SELECT 1`; rejects or throws otherwise. */
  readonly checkDatabase: () => Promise<void> | void;
}

export function createHealthRoutes(deps: HealthDeps): RouteModule {
  const router = Router();
  router.get('/health', async (req, res) => {
    try {
      await deps.checkDatabase();
    } catch (error) {
      req.log.error({ err: error }, 'health check failed');
      fail(res, {
        status: 503,
        code: 'INTERNAL',
        message: 'Service unavailable',
        retryAfterSeconds: 5,
      });
      return;
    }
    ok(res, { status: 'ok', db: 'ok' });
  });
  return { mountPath: '/api', router };
}
