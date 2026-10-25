import { checkGuestbookBody } from '@portfolio/contracts';
import { describe, expect, it } from 'vitest';
import { fixtureText } from '../../infra/review/test-kit.ts';
import { findBlockedTerm } from './blocked-terms.ts';
import { checkQuality, type QualityRule } from './quality-rules.ts';

const lines = (name: string): string[] =>
  fixtureText(`guestbook/${name}`)
    .split('\n')
    .filter((line) => line.trim() !== '');

const ruleOf = (text: string): QualityRule | 'pass' => {
  const result = checkQuality(text);
  return result.ok ? 'pass' : result.rule;
};

describe('calibration corpora', () => {
  it.each(['legit-messages.en.txt', 'legit-messages.pl.txt'])(
    '%s: at least 50 notes, all pass every local rule',
    (name) => {
      const notes = lines(name);
      expect(notes.length).toBeGreaterThanOrEqual(50);
      for (const note of notes) {
        const { normalized, errors } = checkGuestbookBody(note);
        expect({ note, errors }).toEqual({ note, errors: [] });
        expect({ note, rule: ruleOf(normalized) }).toEqual({ note, rule: 'pass' });
        expect({ note, term: findBlockedTerm(normalized) }).toEqual({ note, term: null });
      }
    },
  );

  it('weird-messages.txt: every line is caught by some rule', () => {
    for (const note of lines('weird-messages.txt')) {
      expect({ note, caught: ruleOf(checkGuestbookBody(note).normalized) !== 'pass' }).toEqual({
        note,
        caught: true,
      });
    }
  });
});

describe('checkQuality boundaries', () => {
  it.each([
    ['no_words', 'a', 'a b'],
    ['shouting', 'HELLO WORLD!', 'Hello WORLD!'],
    ['character_run', 'soooooon', 'sooooon'],
    ['symbol_flood', 'hi ?!?!?', 'hi ?!?! there'],
    ['keyboard_mash', 'zxcvbnm', 'zxcvbn'],
    ['repetition', 'go go go go', 'go go go'],
    ['unbroken_token', 'ab'.repeat(16), 'ab'.repeat(15)],
  ] as const)(
    '%s fires on the first example and not on the one just inside the limit',
    (rule, fires, passes) => {
      expect(ruleOf(fires)).toBe(rule);
      expect(ruleOf(passes)).toBe('pass');
    },
  );

  it('shouting needs 8 letters and more than 70 percent uppercase', () => {
    expect(ruleOf('ABCDEFG')).toBe('pass');
    expect(ruleOf('ABCDEFGhij')).toBe('pass'); // exactly 70 percent
    expect(ruleOf('ABCDEFGHij')).toBe('shouting');
  });

  it('lets Polish consonant clusters through', () => {
    expect(ruleOf('bezwzględny')).toBe('pass');
    expect(ruleOf('chrząszcz')).toBe('pass');
  });

  it('repetition is case-insensitive and ignores one-letter words', () => {
    expect(ruleOf('Go GO go gO')).toBe('repetition');
    expect(ruleOf('a b a b a b a b hello')).toBe('pass');
  });

  it('counts emoji with a variation selector like plain emoji', () => {
    expect(ruleOf('❤️🔥❤️🔥❤️🔥❤️🔥 fajne')).toBe('symbol_flood');
    expect(ruleOf('😀🔥😀🔥😀🔥😀🔥 fajne')).toBe('symbol_flood');
  });

  it('allows exactly 40 percent symbols among non-space characters', () => {
    expect(ruleOf('hello! ??? x')).toBe('pass');
    expect(ruleOf('hello! ???? x')).toBe('symbol_flood');
  });
});
