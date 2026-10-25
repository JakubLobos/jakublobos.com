import { describe, expect, it } from 'vitest';
import { normalizeContactInput, validateContactInput } from './contact-fields.ts';

const ok = { name: 'Jane', email: 'jane@company.com', message: 'A message long enough.' };
const cp = (...codes: number[]): string => String.fromCodePoint(...codes);

describe('normalizeContactInput', () => {
  it('trims, NFC-normalizes and converts CRLF/CR to LF', () => {
    expect(
      normalizeContactInput({
        name: `  Jane${cp(0x301)} `,
        email: '  a@b.co ',
        message: ` line1${cp(13, 10)}line2${cp(13)}line3 `,
      }),
    ).toEqual({
      name: `Jan${cp(0xe9)}`,
      email: 'a@b.co',
      message: `line1${cp(10)}line2${cp(10)}line3`,
    });
  });
});

describe('validateContactInput', () => {
  it('accepts a valid input', () => {
    expect(validateContactInput(ok)).toEqual({});
  });

  it.each([
    [0, ['too_short']],
    [1, ['too_short']],
    [2, undefined],
    [60, undefined],
    [61, ['too_long']],
  ])('name length %i', (len, expected) => {
    expect(validateContactInput({ ...ok, name: 'a'.repeat(len) }).name).toEqual(expected);
  });

  it('rejects control chars and newlines in name', () => {
    expect(validateContactInput({ ...ok, name: 'Ja\nne' }).name).toEqual(['invalid_characters']);
    expect(validateContactInput({ ...ok, name: 'Ja\tne' }).name).toEqual(['invalid_characters']);
  });

  it.each([
    ['', ['required']],
    ['jane@company.com', undefined],
    ['a@b.co', undefined],
    ['jane', ['invalid']],
    ['jane@company', ['invalid']],
    ['jane@company.c', ['invalid']],
    ['ja ne@company.com', ['invalid']],
    ['@company.com', ['invalid']],
    [`${'a'.repeat(108)}@company.com`, undefined],
    [`${'a'.repeat(109)}@company.com`, ['too_long']],
    [`${'a'.repeat(120)}@c`, ['too_long', 'invalid']],
  ])('email %j', (email, expected) => {
    expect(validateContactInput({ ...ok, email }).email).toEqual(expected);
  });

  it.each([
    [0, ['too_short']],
    [9, ['too_short']],
    [10, undefined],
    [1000, undefined],
    [1001, ['too_long']],
  ])('message length %i', (len, expected) => {
    expect(validateContactInput({ ...ok, message: 'a'.repeat(len) }).message).toEqual(expected);
  });

  it('allows newline and tab in message but not other controls', () => {
    expect(
      validateContactInput({ ...ok, message: 'line one\n\tline two' }).message,
    ).toBeUndefined();
    expect(validateContactInput({ ...ok, message: 'line one\u0000line two' }).message).toEqual([
      'invalid_characters',
    ]);
  });

  it('rejects lone surrogates in name and message', () => {
    expect(validateContactInput({ ...ok, name: `Ja${cp(0xd800)}ne` }).name).toEqual([
      'invalid_characters',
    ]);
    expect(validateContactInput({ ...ok, message: `hello there ${cp(0xdc00)}` }).message).toEqual([
      'invalid_characters',
    ]);
  });

  it('reports multiple fields at once', () => {
    expect(validateContactInput({ name: '', email: '', message: '' })).toEqual({
      name: ['too_short'],
      email: ['required'],
      message: ['too_short'],
    });
  });
});

describe('normalizeContactInput message NFC', () => {
  it('composes decomposed characters in the message', () => {
    const out = normalizeContactInput({ ...ok, message: `caf${cp(0x65, 0x301)} time` });
    expect(out.message).toBe(`caf${cp(0xe9)} time`);
  });
});
