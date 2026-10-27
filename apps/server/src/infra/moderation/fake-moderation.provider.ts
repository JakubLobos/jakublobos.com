import type {
  ModerationOutcome,
  ModerationProvider,
} from '../../domain/guestbook/moderation.port.ts';

export const FAKE_SLOW_DELAY_MS = 6000;

/** Dev/test provider driven by markers in the text. Never used in production (config refuses it). */
export class FakeModerationProvider implements ModerationProvider {
  async moderate(text: string): Promise<ModerationOutcome> {
    if (text.includes('[slow]')) {
      await new Promise<void>((resolve) => setTimeout(resolve, FAKE_SLOW_DELAY_MS));
    }
    if (text.includes('[fail]')) return { kind: 'transient', code: 'provider_error' };
    if (text.includes('[flag]')) {
      return {
        kind: 'ok',
        flagged: true,
        categories: { harassment: true },
        scores: { harassment: 0.9 },
      };
    }
    return {
      kind: 'ok',
      flagged: false,
      categories: { harassment: false },
      scores: { harassment: 0 },
    };
  }
}
