import { describe, expect, it, vi } from 'vitest';
import type { ModerationOutcome } from './moderation.port.ts';
import { createReviewPipeline, type ReviewDecision } from './review-pipeline.ts';
import type { SuitabilityOutcome } from './suitability.port.ts';

const clean = (score = 0): ModerationOutcome => ({
  kind: 'ok',
  flagged: false,
  categories: { harassment: false },
  scores: { harassment: score },
});
const approve: SuitabilityOutcome = { kind: 'ok', verdict: 'approve', reason: 'ok' };

function setup(moderation: ModerationOutcome, suitability: SuitabilityOutcome = approve) {
  const moderate = vi.fn(() => Promise.resolve(moderation));
  const review = vi.fn(() => Promise.resolve(suitability));
  const pipeline = createReviewPipeline({
    moderation: { moderate },
    suitability: { review },
    moderationThreshold: 0.2,
  });
  const run = (body = 'Lovely portfolio, nice work'): Promise<ReviewDecision> =>
    pipeline.reviewMessage({ body, locale: 'en' });
  return { run, moderate, review };
}

describe('review pipeline', () => {
  it('I-1: approves only when rules, moderation and suitability all pass', async () => {
    const { run, review } = setup(clean());
    expect(await run()).toEqual({ kind: 'approve' });
    expect(review).toHaveBeenCalledWith('Lovely portfolio, nice work', 'en');
  });

  it.each<[string, ModerationOutcome, SuitabilityOutcome, ReviewDecision]>([
    [
      'moderation flagged',
      { kind: 'ok', flagged: true, categories: { hate: true }, scores: { hate: 0.9 } },
      approve,
      { kind: 'reject', layer: 'moderation', reason: 'hate' },
    ],
    [
      'score exactly at the threshold',
      clean(0.2),
      approve,
      { kind: 'reject', layer: 'moderation', reason: 'harassment' },
    ],
    [
      'suitability reject',
      clean(),
      { kind: 'ok', verdict: 'reject', reason: 'gibberish' },
      { kind: 'reject', layer: 'suitability', reason: 'gibberish' },
    ],
    [
      'moderation transient (rate limited)',
      { kind: 'transient', code: 'rate_limited', retryAfterSeconds: 90 },
      approve,
      { kind: 'transient', code: 'rate_limited', retryAfterSeconds: 90 },
    ],
    [
      'suitability transient (incomplete)',
      clean(),
      { kind: 'transient', code: 'incomplete' },
      { kind: 'transient', code: 'incomplete' },
    ],
  ])('does not approve: %s', async (_label, moderation, suitability, expected) => {
    expect(await setup(moderation, suitability).run()).toEqual(expected);
  });

  it('accepts a score just under the threshold', async () => {
    expect(await setup(clean(0.1999)).run()).toEqual({ kind: 'approve' });
  });

  it('rejects text that now breaks a local rule, without calling any provider', async () => {
    const { run, moderate, review } = setup(clean());
    expect(await run('buy crypto now')).toEqual({
      kind: 'reject',
      layer: 'rules',
      reason: 'blocked_term',
    });
    expect(await run('visit example.com today')).toMatchObject({ layer: 'rules' });
    expect(moderate).not.toHaveBeenCalled();
    expect(review).not.toHaveBeenCalled();
  });

  it('AC-5: never calls suitability when moderation rejects or is transient', async () => {
    const flagged = setup({ kind: 'ok', flagged: true, categories: {}, scores: { a: 1 } });
    await flagged.run();
    const transient = setup({ kind: 'transient', code: 'timeout' });
    await transient.run();
    expect(flagged.review).not.toHaveBeenCalled();
    expect(transient.review).not.toHaveBeenCalled();
  });
});
