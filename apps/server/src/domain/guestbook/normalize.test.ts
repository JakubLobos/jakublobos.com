import { describe, expect, it } from 'vitest';
import { sha256Hasher } from '../../infra/crypto/sha256.hasher.ts';
import { contentHash, dedupeKey } from './normalize.ts';

describe('dedupeKey / contentHash', () => {
  it('treats composed and decomposed Polish letters as the same message', () => {
    const composed = 'Świetna strona, dzięki za ąę i ó';
    const decomposed = composed.normalize('NFD');
    expect(decomposed).not.toBe(composed);
    expect(contentHash(decomposed, sha256Hasher)).toBe(contentHash(composed, sha256Hasher));
  });

  it.each([
    ['case', 'GREAT SITE', 'great site'],
    ['whitespace runs', 'great \t  site', 'great site'],
    ['trailing punctuation', 'great site!!! ...', 'great site'],
    ['compatibility forms (full-width)', 'ｇｒｅａｔ site', 'great site'],
  ])('ignores %s', (_label, a, b) => {
    expect(dedupeKey(a)).toBe(dedupeKey(b));
  });

  it('keeps messages that differ in meaning apart', () => {
    expect(dedupeKey('great site')).not.toBe(dedupeKey('great sites'));
    expect(dedupeKey('what? great site')).not.toBe(dedupeKey('great site'));
  });

  it('hashes with SHA-256 over the key (known vector)', () => {
    expect(sha256Hasher.sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(contentHash('ABC!', sha256Hasher)).toBe(sha256Hasher.sha256Hex('abc'));
  });
});
