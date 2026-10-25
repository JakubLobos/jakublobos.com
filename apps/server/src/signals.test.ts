import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { createShutdownManager } from './shutdown.ts';
import { installSignalHandlers } from './signals.ts';

function fakeProcess() {
  const emitter = new EventEmitter();
  const exit = vi.fn();
  return {
    emitter,
    exit,
    proc: {
      once: (event: 'SIGTERM' | 'SIGINT', listener: () => void) => emitter.once(event, listener),
      exit,
    },
  };
}

const settle = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

describe('installSignalHandlers', () => {
  it.each(['SIGTERM', 'SIGINT'] as const)('%s runs hooks once and exits 0', async (signal) => {
    vi.useFakeTimers();
    try {
      const { proc, emitter, exit } = fakeProcess();
      const manager = createShutdownManager({ timeoutMs: 10_000 });
      const hook = vi.fn();
      manager.onShutdown(hook);
      const flush = vi.fn();
      installSignalHandlers(proc, manager, { flush });

      emitter.emit(signal);
      await settle();

      expect(hook).toHaveBeenCalledOnce();
      expect(flush).toHaveBeenCalledOnce();
      expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a second signal while shutting down', async () => {
    vi.useFakeTimers();
    try {
      const { proc, emitter, exit } = fakeProcess();
      const manager = createShutdownManager({ timeoutMs: 10_000 });
      const hook = vi.fn();
      manager.onShutdown(hook);
      const onSignal = vi.fn();
      installSignalHandlers(proc, manager, { onSignal });

      emitter.emit('SIGTERM');
      emitter.emit('SIGINT');
      await settle();

      expect(onSignal).toHaveBeenCalledExactlyOnceWith('SIGTERM');
      expect(hook).toHaveBeenCalledOnce();
      expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('exits 1 when a hook hangs past the deadline', async () => {
    vi.useFakeTimers();
    try {
      const { proc, emitter, exit } = fakeProcess();
      const manager = createShutdownManager({ timeoutMs: 10_000 });
      manager.onShutdown(() => new Promise<void>(() => undefined));
      installSignalHandlers(proc, manager);

      emitter.emit('SIGTERM');
      await vi.advanceTimersByTimeAsync(9_999);
      expect(exit).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('exits 1 when the shutdown run itself rejects', async () => {
    const { proc, emitter, exit } = fakeProcess();
    const manager = {
      onShutdown: vi.fn(),
      timedOut: () => false,
      run: () => Promise.reject(new Error('boom')),
    };
    installSignalHandlers(proc, manager);
    emitter.emit('SIGINT');
    await vi.waitFor(() => {
      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    });
  });
});
