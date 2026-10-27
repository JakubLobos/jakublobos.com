import { describe, expect, it } from 'vitest';
import { decideModeration } from './moderation-policy.ts';

const THRESHOLD = 0.2;
const withScore = (score: number) => ({
  flagged: false,
  categories: { hate: false },
  scores: { hate: score },
});

describe('decideModeration', () => {
  it('rejects at the threshold (equal counts) and approves just below it', () => {
    expect(decideModeration(withScore(0.2), THRESHOLD)).toEqual({
      decision: 'reject',
      categories: ['hate'],
    });
    expect(decideModeration(withScore(0.1999), THRESHOLD)).toEqual({ decision: 'approve' });
  });

  it('rejects flagged text even when every score is low', () => {
    expect(
      decideModeration({ flagged: true, categories: {}, scores: { hate: 0.01 } }, THRESHOLD),
    ).toEqual({ decision: 'reject', categories: [] });
  });

  it('lists every offending category once, sorted', () => {
    const decision = decideModeration(
      {
        flagged: true,
        categories: { violence: true, hate: true, sexual: false },
        scores: { violence: 0.5, sexual: 0.3, harassment: 0.01 },
      },
      THRESHOLD,
    );
    expect(decision).toEqual({ decision: 'reject', categories: ['hate', 'sexual', 'violence'] });
  });
});
