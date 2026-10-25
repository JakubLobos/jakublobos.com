import type { RequestHandler } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

/**
 * Logs method, path (no query string), status, duration and request id. Serializers are
 * allow-lists, so headers (including X-Real-IP), bodies and socket addresses can't leak.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: (req) => (typeof req.id === 'string' ? req.id : 'unknown'),
    serializers: {
      req: (req: { id?: unknown; method?: string; url?: string }) => ({
        id: req.id,
        method: req.method,
        path: (req.url ?? '').split('?')[0],
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (_req, res, error) => {
      if (error !== undefined || res.statusCode >= 500) return 'error';
      return res.statusCode >= 400 ? 'warn' : 'info';
    },
    // No request/response object refs beyond the allow-listed serializers above.
    quietReqLogger: true,
  });
}
