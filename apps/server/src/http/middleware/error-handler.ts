import type { ErrorRequestHandler } from 'express';
import { fail } from '../respond.ts';

interface ClientErrorInfo {
  readonly status: number;
  readonly type: string | undefined;
}

/**
 * Narrows body-parser / http-errors failures. http-errors marks its 4xx errors `expose: true`;
 * provider or SDK errors that merely carry a 4xx `status` (OpenAI 401, Resend 429) lack it,
 * so they stay real faults instead of being reported as the client's malformed JSON.
 */
function clientErrorInfo(error: unknown): ClientErrorInfo | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { status, statusCode, type, expose } = error as Record<string, unknown>;
  if (expose !== true) return undefined;
  const code = typeof status === 'number' ? status : statusCode;
  if (typeof code !== 'number' || code < 400 || code > 499) return undefined;
  return { status: code, type: typeof type === 'string' ? type : undefined };
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const client = clientErrorInfo(error);
  if (client !== undefined) {
    // Anonymous clients can trigger these at will: warn, no stack, never error-level.
    req.log.warn({ status: client.status, type: client.type }, 'client error');
    if (client.status === 413 || client.type === 'entity.too.large') {
      fail(res, { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Body is too large' });
    } else if (client.status === 415) {
      fail(res, {
        status: 415,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported charset or content encoding',
      });
    } else {
      fail(res, { status: 400, code: 'INVALID_JSON', message: 'Body is not valid JSON' });
    }
    return;
  }
  // The response never carries details; the request id correlates it to this log line.
  req.log.error({ err: error }, 'unhandled error');
  fail(res, { status: 500, code: 'INTERNAL', message: 'Internal server error' });
};
