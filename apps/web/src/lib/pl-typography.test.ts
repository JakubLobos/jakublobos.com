import { describe, expect, it } from 'vitest';
import { polishDeep, polishTypography } from './pl-typography.ts';

const NBSP = '\u00A0';

describe('polishTypography', () => {
  it('binds single-letter words to the next word', () => {
    expect(polishTypography('Dane i stan w aplikacji')).toBe(`Dane i${NBSP}stan w${NBSP}aplikacji`);
    expect(polishTypography('O mnie')).toBe(`O${NBSP}mnie`);
    expect(polishTypography('Z nami a on')).toBe(`Z${NBSP}nami a${NBSP}on`);
  });

  it('does not touch letters inside words, other single letters, or a trailing letter', () => {
    expect(polishTypography('Software Engineer')).toBe('Software Engineer');
    expect(polishTypography('Plan B zawsze')).toBe('Plan B zawsze');
    expect(polishTypography('Tak, to a')).toBe('Tak, to a');
  });

  it('binds numbers to their units', () => {
    expect(polishTypography('do 30 dni, 100 wpisów, 1 rok, 120 znakach, 24 godzin')).toBe(
      `do 30${NBSP}dni, 100${NBSP}wpisów, 1${NBSP}rok, 120${NBSP}znakach, 24${NBSP}godzin`,
    );
    expect(polishTypography('2023 — obecnie')).toBe('2023 — obecnie');
    expect(polishTypography('5 dniach')).toBe(`5${NBSP}dniach`);
  });

  it('binds abbreviations to what follows', () => {
    expect(polishTypography('(maks. 60 znaków), min. 10 znaków, art. 6 ust. 1 lit. a zgoda')).toBe(
      `(maks.${NBSP}60${NBSP}znaków), min.${NBSP}10${NBSP}znaków, art.${NBSP}6 ust.${NBSP}1 lit.${NBSP}a${NBSP}zgoda`,
    );
  });

  it('is idempotent and keeps placeholders intact', () => {
    const once = polishTypography('Odpowiem w {email} i wrócę o 5 dni');
    expect(polishTypography(once)).toBe(once);
    expect(once).toContain('{email}');
  });
});

describe('polishDeep', () => {
  it('transforms strings and function results, and leaves skipped keys alone', () => {
    const out = polishDeep(
      {
        a: 'w domu',
        list: ['i tak'],
        fn: ({ n }: { n: number }) => `${n} wpisów w mieście`,
        id: 'a b',
      },
      new Set(['id']),
    );
    expect(out.a).toBe(`w${NBSP}domu`);
    expect(out.list[0]).toBe(`i${NBSP}tak`);
    expect(out.fn({ n: 3 })).toBe(`3${NBSP}wpisów w${NBSP}mieście`);
    expect(out.id).toBe('a b');
  });
});
