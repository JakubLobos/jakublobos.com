import { isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';

export type ClientIpSource = 'socket' | 'x-real-ip';

/**
 * The client address used for rate limiting. Express `trust proxy` stays off, so `req.ip`
 * is never used. With `x-real-ip` we accept only a single, syntactically valid address
 * (Railway's edge sets it); anything else (garbage, lists, missing) falls back to the socket.
 */
export function resolveClientIp(
  req: Pick<IncomingMessage, 'headers' | 'socket'>,
  source: ClientIpSource,
): string {
  if (source === 'x-real-ip') {
    const header = req.headers['x-real-ip'];
    const candidate = typeof header === 'string' ? header.trim() : undefined;
    if (candidate !== undefined && isIP(candidate) !== 0) return candidate;
  }
  return req.socket.remoteAddress ?? 'unknown';
}
