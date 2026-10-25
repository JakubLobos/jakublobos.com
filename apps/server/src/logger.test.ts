import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.ts';
import { createLogCapture } from './test-support/test-app.ts';

const cases: [string, Record<string, unknown>][] = [
  ['req.headers.authorization', { req: { headers: { authorization: 'SECRET' } } }],
  ['req.headers.cookie', { req: { headers: { cookie: 'SECRET' } } }],
  ['req.headers["x-real-ip"]', { req: { headers: { 'x-real-ip': 'SECRET' } } }],
  ['req.headers["x-forwarded-for"]', { req: { headers: { 'x-forwarded-for': 'SECRET' } } }],
  ['req.ip', { req: { ip: 'SECRET' } }],
  ['ip', { ip: 'SECRET' }],
  ['*.ip', { client: { ip: 'SECRET' } }],
  ['remoteAddress', { remoteAddress: 'SECRET' }],
  ['*.remoteAddress', { socket: { remoteAddress: 'SECRET' } }],
  ['*.apiKey', { provider: { apiKey: 'SECRET' } }],
  ['*.password', { db: { password: 'SECRET' } }],
  ['body', { body: 'SECRET' }],
  ['email', { email: 'SECRET' }],
  ['name', { name: 'SECRET' }],
  ['*.body', { input: { body: 'SECRET' } }],
  ['*.email', { input: { email: 'SECRET' } }],
  ['*.name', { input: { name: 'SECRET' } }],
];

describe('logger redaction', () => {
  it.each(cases)('redacts %s', (_path, payload) => {
    const capture = createLogCapture();
    createLogger({ level: 'info', destination: capture.stream }).info(payload, 'probe');
    const output = capture.text();
    expect(output).toContain('[Redacted]');
    expect(output).not.toContain('SECRET');
  });
});
