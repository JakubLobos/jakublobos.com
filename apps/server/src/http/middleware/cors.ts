import cors from 'cors';
import type { RequestHandler } from 'express';

export function corsAllowlist(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return cors({
    // Returning false emits no CORS headers, so the browser blocks the response.
    origin: (origin, callback) => {
      callback(null, origin !== undefined && allowed.has(origin));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After', 'RateLimit', 'RateLimit-Policy'],
    maxAge: 600,
    credentials: false,
    optionsSuccessStatus: 204,
  });
}
