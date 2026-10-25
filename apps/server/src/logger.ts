import { pino, type DestinationStream, type Logger } from 'pino';

export interface LoggerOptions {
  readonly level: string;
  readonly pretty?: boolean;
  /** Tests inject a capture stream; production writes JSON to stdout. */
  readonly destination?: DestinationStream;
}

// Defence in depth: request logging already serializes only method/path/status/id,
// but anything a future caller passes to the logger is still scrubbed.
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-real-ip"]',
  '*.apiKey',
  '*.password',
  'body',
  'email',
  'name',
  '*.body',
  '*.email',
  '*.name',
  // Client addresses and forwarding headers must never reach a log line (AGENTS.md rule 5).
  'ip',
  '*.ip',
  'remoteAddress',
  '*.remoteAddress',
  'req.ip',
  'req.headers["x-forwarded-for"]',
  '*.headers.authorization',
  '*.headers.cookie',
  '*.headers["x-real-ip"]',
  '*.headers["x-forwarded-for"]',
];

export function createLogger(options: LoggerOptions): Logger {
  const base = {
    level: options.level,
    redact: { paths: REDACT_PATHS, censor: '[Redacted]' },
  };
  if (options.destination) return pino(base, options.destination);
  if (options.pretty === true) {
    return pino({ ...base, transport: { target: 'pino-pretty' } });
  }
  return pino(base);
}
