import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineMessages } from './t.ts';

describe('defineMessages', () => {
  const messages = defineMessages({
    en: { title: 'Hello', nested: { greet: ({ name }: { name: string }) => `Hi ${name}` } },
    pl: { title: 'Cześć', nested: { greet: ({ name }: { name: string }) => `Hej ${name}` } },
  });

  it('selects the locale and keeps parameterised messages callable', () => {
    expect(messages('en').title).toBe('Hello');
    expect(messages('pl').title).toBe('Cześć');
    expect(messages('pl').nested.greet({ name: 'Ola' })).toBe('Hej Ola');
    expectTypeOf(messages('en').title).toEqualTypeOf<string>();
  });

  it('rejects PL catalogues that miss or add keys (AC-3)', () => {
    defineMessages({
      en: { a: 'a', nested: { b: 'b' } },
      // @ts-expect-error pl is missing `nested.b`
      pl: { a: 'a', nested: {} },
    });

    defineMessages({
      en: { a: 'a' },
      // @ts-expect-error pl is missing `a`
      pl: {},
    });

    defineMessages({
      en: { a: 'a' },
      // @ts-expect-error pl has the extra key `extra`
      pl: { a: 'a', extra: 'x' },
    });

    defineMessages({
      en: { a: 'a' },
      // @ts-expect-error pl must keep the string type
      pl: { a: () => 'a' },
    });
  });
});
