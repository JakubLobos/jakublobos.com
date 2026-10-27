import type { Locale } from '@portfolio/contracts';

type Message = string | ((params: never) => string);

interface MessageTree {
  readonly [key: string]: Message | MessageTree;
}

/**
 * `en` defines the shape; `NoInfer` stops `pl` from widening it, so a missing or extra PL key
 * (at any depth) is a compile-time error instead of a runtime fallback.
 */
export function defineMessages<T extends MessageTree>(messages: {
  en: T;
  pl: NoInfer<T>;
}): (locale: Locale) => T {
  return (locale) => messages[locale];
}
