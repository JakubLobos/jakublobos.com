import type { Locale } from '@portfolio/contracts';
import { polishDeep } from '../lib/pl-typography.ts';

type Message = string | ((params: never) => string);

interface MessageTree {
  readonly [key: string]: Message | MessageTree;
}

/**
 * `en` defines the shape; `NoInfer` stops `pl` from widening it, so a missing or extra PL key
 * (at any depth) is a compile-time error instead of a runtime fallback. The PL tree gets Polish
 * typography (non-breaking spaces) once, here, so no component has to remember it.
 */
export function defineMessages<T extends MessageTree>(messages: {
  en: T;
  pl: NoInfer<T>;
}): (locale: Locale) => T {
  const typeset = { en: messages.en, pl: polishDeep(messages.pl) };
  return (locale) => typeset[locale];
}
