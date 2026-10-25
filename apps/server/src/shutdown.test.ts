import { describe, expect, it, vi } from 'vitest';
import { createShutdownManager } from './shutdown.ts';

describe('createShutdownManager', () => {
  it('runs hooks once, in reverse registration order, even if triggered twice', async () => {
    const order: string[] = [];
    const manager = createShutdownManager({ timeoutMs: 1000 });
    manager.onShutdown(() => {
      order.push('first');
    });
    manager.onShutdown(async () => {
      await Promise.resolve();
      order.push('second');
    });
    await Promise.all([manager.run(), manager.run()]);
    await manager.run();
    expect(order).toEqual(['second', 'first']);
  });

  it('keeps going and reports when a hook throws', async () => {
    const onError = vi.fn();
    const ran = vi.fn();
    const manager = createShutdownManager({ timeoutMs: 1000, onError });
    manager.onShutdown(ran);
    manager.onShutdown(() => {
      throw new Error('hook failed');
    });
    await manager.run();
    expect(ran).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('gives up after the deadline instead of hanging', async () => {
    vi.useFakeTimers();
    try {
      const manager = createShutdownManager({ timeoutMs: 50 });
      manager.onShutdown(() => new Promise<void>(() => undefined));
      const done = manager.run();
      await vi.advanceTimersByTimeAsync(50);
      await expect(done).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
