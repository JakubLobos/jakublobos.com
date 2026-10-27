import { describe, expect, it } from 'vitest';
import { formatPhone } from './phone.ts';

describe('formatPhone', () => {
  it('groups a Polish number as +48 XXX XXX XXX', () => {
    expect(formatPhone('+48000000000')).toEqual({
      display: '+48 000 000 000',
      tel: '+48000000000',
    });
  });

  it.each([
    ['+442079460123', '+44 207 946 012 3'],
    ['+12025550123', '+1 202 555 012 3'],
  ])('falls back to country code plus groups of three for %s', (e164, display) => {
    expect(formatPhone(e164)).toEqual({ display, tel: e164 });
  });
});
