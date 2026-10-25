import type { RequestHandler } from 'express';
import type { IdGenerator } from '../../domain/shared/ids.ts';

// Accept a caller-supplied id only if it is short and log-safe; otherwise mint our own.
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

export function requestId(ids: IdGenerator): RequestHandler {
  return (req, res, next) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : ids.next();
    req.id = id;
    res.setHeader('X-Request-Id', id);
    next();
  };
}
