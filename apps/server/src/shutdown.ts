export type ShutdownHook = () => Promise<void> | void;

export interface ShutdownManager {
  /** Register cleanup (stop worker, close DB, ...). Hooks run once, in reverse order. */
  onShutdown(hook: ShutdownHook): void;
  /** Runs hooks (at most once, even if called repeatedly), bounded by `timeoutMs`. */
  run(): Promise<void>;
  /** True if the run gave up at the deadline with hooks still pending. */
  timedOut(): boolean;
}

export function createShutdownManager(options: {
  readonly timeoutMs: number;
  readonly onError?: (error: unknown) => void;
}): ShutdownManager {
  const hooks: ShutdownHook[] = [];
  let running: Promise<void> | undefined;
  let deadlineHit = false;

  return {
    onShutdown(hook) {
      hooks.push(hook);
    },
    timedOut: () => deadlineHit,
    run() {
      running ??= (async () => {
        let finished = false;
        const work = (async () => {
          for (const hook of hooks.toReversed()) {
            try {
              await hook();
            } catch (error) {
              options.onError?.(error);
            }
          }
          finished = true;
        })();
        let timer: NodeJS.Timeout | undefined;
        const deadline = new Promise<void>((resolve) => {
          timer = setTimeout(resolve, options.timeoutMs);
          timer.unref();
        });
        await Promise.race([work, deadline]);
        clearTimeout(timer);
        deadlineHit = !finished;
      })();
      return running;
    },
  };
}
