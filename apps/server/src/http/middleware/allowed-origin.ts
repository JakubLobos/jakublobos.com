import type { RequestHandler } from 'express';
import { fail } from '../respond.ts';

/** CORS only protects reads; this stops other sites from causing POST side effects. */
export function allowedOrigin(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    if (req.method !== 'POST') {
      next();
      return;
    }
    const origin = req.headers.origin;
    if (typeof origin === 'string' && allowed.has(origin)) {
      next();
      return;
    }
    fail(res, { status: 403, code: 'FORBIDDEN_ORIGIN', message: 'Origin not allowed' });
  };
}
