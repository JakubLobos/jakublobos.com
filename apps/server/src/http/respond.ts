import type { Response } from 'express';

/**
 * Server-local mirror of docs/api.md section 1.1. T-010 moves the canonical union into
 * `@portfolio/contracts`; switch to that import once it lands on main.
 */
export type ApiErrorCode =
  | 'INVALID_JSON'
  | 'FORBIDDEN_ORIGIN'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'GUESTBOOK_BUSY'
  | 'MAIL_UNAVAILABLE'
  | 'VERIFICATION_FAILED'
  | 'VERIFICATION_UNAVAILABLE'
  | 'INTERNAL';

export interface FailOptions {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly fields?: Readonly<Record<string, readonly string[]>>;
  readonly retryAfterSeconds?: number;
}

export function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ data });
}

export function fail(res: Response, options: FailOptions): void {
  const header = res.getHeader('X-Request-Id');
  const requestId = typeof header === 'string' ? header : undefined;
  if (options.retryAfterSeconds !== undefined) {
    res.setHeader('Retry-After', String(options.retryAfterSeconds));
  }
  res.status(options.status).json({
    error: {
      code: options.code,
      message: options.message,
      ...(options.fields ? { fields: options.fields } : {}),
      ...(requestId === undefined ? {} : { requestId }),
    },
  });
}
