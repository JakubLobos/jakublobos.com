import { describe, expect, it } from 'vitest';
import { createHttpServer } from './server.ts';

describe('createHttpServer', () => {
  it('applies the slow-loris timeouts and a prompt connection check interval', () => {
    const server = createHttpServer(() => undefined);
    expect(server.headersTimeout).toBe(15_000);
    expect(server.requestTimeout).toBe(20_000);
    expect(server.keepAliveTimeout).toBe(5_000);
    // Not in @types/node; Node stores the option on the instance.
    const withInterval = server as unknown as { connectionsCheckingInterval?: number };
    expect(withInterval.connectionsCheckingInterval).toBe(5_000);
  });
});
