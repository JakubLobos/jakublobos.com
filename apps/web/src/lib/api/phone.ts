import type { PhoneRevealResponse } from '@portfolio/contracts';
import { request, type ApiResult, type Guard } from './client.ts';

export type PhoneReveal = PhoneRevealResponse['data'];

const TEL_PATTERN = /^\+\d{8,15}$/;
const DISPLAY_MAX = 40;

// The number ends up in an `href`, so a response that is not a plain E.164 value is refused
// instead of being rendered.
export const isPhoneReveal: Guard<PhoneReveal> = (value): value is PhoneReveal =>
  typeof value === 'object' &&
  value !== null &&
  'display' in value &&
  'tel' in value &&
  typeof value.display === 'string' &&
  value.display.length > 0 &&
  value.display.length <= DISPLAY_MAX &&
  typeof value.tel === 'string' &&
  TEL_PATTERN.test(value.tel);

// Every failure (403 verification, 429, 503, network) reads the same to the visitor, so the
// shared client's coarse kinds are enough here.
export function revealPhone(turnstileToken: string): Promise<ApiResult<PhoneReveal>> {
  return request('/api/contact/phone', { method: 'POST', body: { turnstileToken } }, isPhoneReveal);
}
