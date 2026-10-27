import { describe, expect, it } from 'vitest';
import { diffUnits, splitGraphemes, splitRuns, unitIndexAt } from './text-diff.ts';

const diff = (prev: string, next: string, caretEnd?: number) =>
  diffUnits(splitGraphemes(prev), splitGraphemes(next), caretEnd);

describe('diffUnits', () => {
  it('reports nothing for identical text', () => {
    expect(diff('hello', 'hello')).toEqual({ start: 5, removed: 0, inserted: 0 });
  });

  it('marks only the appended unit when typing at the end', () => {
    expect(diff('hell', 'hello')).toEqual({ start: 4, removed: 0, inserted: 1 });
  });

  it('marks the inserted run for a paste in the middle', () => {
    expect(diff('ad', 'abcd')).toEqual({ start: 1, removed: 0, inserted: 2 });
  });

  it('removes without inserting when deleting in the middle', () => {
    expect(diff('abcd', 'ad')).toEqual({ start: 1, removed: 2, inserted: 0 });
  });

  it('replaces a selection', () => {
    expect(diff('hello world', 'hello there')).toEqual({ start: 6, removed: 5, inserted: 5 });
  });

  it('handles clearing and filling from empty', () => {
    expect(diff('abc', '')).toEqual({ start: 0, removed: 3, inserted: 0 });
    expect(diff('', 'abc')).toEqual({ start: 0, removed: 0, inserted: 3 });
  });

  it('uses the caret to place an edit among repeated characters', () => {
    expect(diff('aa', 'aaa')).toEqual({ start: 2, removed: 0, inserted: 1 });
    expect(diff('aa', 'aaa', 1)).toEqual({ start: 0, removed: 0, inserted: 1 });
  });

  it('ignores a caret that does not match the new text', () => {
    expect(diff('abc', 'abXc', 0)).toEqual({ start: 2, removed: 0, inserted: 1 });
  });

  it('maps UTF-16 offsets to unit indices', () => {
    const units = splitGraphemes('a😀b');
    expect(unitIndexAt(units, 0)).toBe(0);
    expect(unitIndexAt(units, 1)).toBe(1);
    expect(unitIndexAt(units, 3)).toBe(2);
    expect(unitIndexAt(units, 4)).toBe(3);
  });
});

describe('splitRuns', () => {
  const words = (text: string) =>
    splitRuns(splitGraphemes(text)).map((run) => text.slice(run.from, run.to));

  it('alternates word and whitespace runs, treating newlines as whitespace', () => {
    expect(splitRuns(splitGraphemes('hi  you\nok'))).toEqual([
      { word: true, from: 0, to: 2 },
      { word: false, from: 2, to: 4 },
      { word: true, from: 4, to: 7 },
      { word: false, from: 7, to: 8 },
      { word: true, from: 8, to: 10 },
    ]);
  });

  it('splits a token where a browser may wrap inside it', () => {
    expect(words('front-end')).toEqual(['front-', 'end']);
    expect(words('2024-05-01')).toEqual(['2024-', '05-', '01']);
    expect(words('x.pl/a?b=1')).toEqual(['x.pl/a?', 'b=1']);
    expect(words('ok—go')).toEqual(['ok', '—', 'go']);
  });

  it('keeps slashes, stray hyphens and punctuation whole', () => {
    expect(words('https://x.pl/a')).toEqual(['https://x.pl/a']);
    expect(words('-x a--b 1/2 wow?!')).toEqual(['-x', ' ', 'a--b', ' ', '1/2', ' ', 'wow?!']);
  });

  it('returns no runs for empty text', () => {
    expect(splitRuns([])).toEqual([]);
  });
});
