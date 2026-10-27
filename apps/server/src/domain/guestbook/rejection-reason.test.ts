import { describe, expect, it } from 'vitest';
import { generalReason } from './rejection-reason.ts';
import { SUITABILITY_REASONS } from './suitability.port.ts';

describe('generalReason', () => {
  it.each([
    ['moderation', 'harassment,hate', 'inappropriate'],
    ['rules', 'blocked_term', 'inappropriate'],
    ['rules', 'blocked_term_meme', 'off_topic'],
    ['rules', 'shouting', 'off_topic'],
    ['rules', 'keyboard_mash', 'off_topic'],
    ['suitability', 'offensive_or_rude', 'inappropriate'],
    ['suitability', 'sexual_or_suggestive', 'inappropriate'],
    ['suitability', 'political_or_religious', 'inappropriate'],
    ['suitability', 'negative_about_owner', 'inappropriate'],
    ['suitability', 'spam_or_ads', 'inappropriate'],
    ['suitability', 'self_promotion', 'inappropriate'],
    ['suitability', 'low_effort_or_meme', 'off_topic'],
    ['suitability', 'off_topic_or_weird', 'off_topic'],
    ['suitability', 'gibberish', 'off_topic'],
    ['suitability', 'other', 'off_topic'],
    ['suitability', 'impersonation', 'impersonation'],
    ['suitability', 'personal_data', 'personal_data'],
  ] as const)('%s / %s -> %s', (layer, reason, expected) => {
    expect(generalReason({ layer, reason })).toBe(expected);
  });

  it('maps every suitability reason to one of the four visitor reasons', () => {
    for (const reason of SUITABILITY_REASONS) {
      expect(['inappropriate', 'off_topic', 'impersonation', 'personal_data']).toContain(
        generalReason({ layer: 'suitability', reason }),
      );
    }
  });
});
