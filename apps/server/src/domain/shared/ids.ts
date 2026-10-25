import { randomUUID } from 'node:crypto';

export interface IdGenerator {
  next(): string;
}

export const uuidGenerator: IdGenerator = { next: () => randomUUID() };

/** Predictable ids (`prefix-1`, `prefix-2`, ...) for tests. */
export function createSequentialIds(prefix = 'id'): IdGenerator {
  let counter = 0;
  return {
    next: () => {
      counter += 1;
      return `${prefix}-${String(counter)}`;
    },
  };
}
