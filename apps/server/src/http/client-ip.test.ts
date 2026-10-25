import { describe, expect, it } from 'vitest';
import { resolveClientIp } from './client-ip.ts';

const SOCKET = '10.1.2.3';

function req(headers: Record<string, string | string[]>) {
  return { headers, socket: { remoteAddress: SOCKET } } as unknown as Parameters<
    typeof resolveClientIp
  >[0];
}

describe('resolveClientIp', () => {
  it.each([
    ['IPv4', '203.0.113.7'],
    ['IPv6', '2001:db8::1'],
    ['IPv4 with surrounding spaces', '  198.51.100.4  '],
  ])('uses a valid %s X-Real-IP in x-real-ip mode', (_name, value) => {
    expect(resolveClientIp(req({ 'x-real-ip': value }), 'x-real-ip')).toBe(value.trim());
  });

  it.each([
    ['garbage', 'not-an-ip'],
    ['a comma list', '203.0.113.7, 198.51.100.4'],
    ['an empty value', ''],
    ['a host:port', '203.0.113.7:8080'],
  ])('falls back to the socket for %s', (_name, value) => {
    expect(resolveClientIp(req({ 'x-real-ip': value }), 'x-real-ip')).toBe(SOCKET);
  });

  it('falls back to the socket when the header is missing or repeated', () => {
    expect(resolveClientIp(req({}), 'x-real-ip')).toBe(SOCKET);
    expect(resolveClientIp(req({ 'x-real-ip': ['203.0.113.7', '203.0.113.8'] }), 'x-real-ip')).toBe(
      SOCKET,
    );
  });

  it('ignores the header entirely in socket mode', () => {
    expect(resolveClientIp(req({ 'x-real-ip': '203.0.113.7' }), 'socket')).toBe(SOCKET);
  });

  it('reports "unknown" when there is no socket address', () => {
    const noAddress = { headers: {}, socket: {} } as unknown as Parameters<
      typeof resolveClientIp
    >[0];
    expect(resolveClientIp(noAddress, 'socket')).toBe('unknown');
  });
});
