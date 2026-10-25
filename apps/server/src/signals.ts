import type { ShutdownManager } from './shutdown.ts';

type SignalName = 'SIGTERM' | 'SIGINT';

export interface SignalProcess {
  once(event: SignalName, listener: () => void): unknown;
  exit(code: number): unknown;
}

/**
 * Wires SIGTERM/SIGINT to a single graceful shutdown. Exits 0 when every hook finished
 * and 1 if the manager itself fails; the manager's own deadline bounds how long this takes.
 */
export function installSignalHandlers(
  proc: SignalProcess,
  shutdown: ShutdownManager,
  hooks: { readonly onSignal?: (signal: SignalName) => void; readonly flush?: () => void } = {},
): void {
  let started = false;
  const handle = (signal: SignalName) => {
    // A second signal during shutdown must not start a second run.
    if (started) return;
    started = true;
    hooks.onSignal?.(signal);
    shutdown.run().then(
      () => {
        hooks.flush?.();
        proc.exit(shutdown.timedOut() ? 1 : 0);
      },
      () => {
        hooks.flush?.();
        proc.exit(1);
      },
    );
  };
  proc.once('SIGTERM', () => {
    handle('SIGTERM');
  });
  proc.once('SIGINT', () => {
    handle('SIGINT');
  });
}
