import { GUESTBOOK_MESSAGE_MAX_LENGTH } from '../constants.ts';
import type { FieldErrorCode } from '../types.ts';

export const LINK_TLDS = [
  'com',
  'net',
  'org',
  'pl',
  'eu',
  'io',
  'dev',
  'app',
  'co',
  'me',
  'info',
  'biz',
  'xyz',
  'ru',
  'de',
  'uk',
  'us',
  'online',
  'site',
  'top',
  'shop',
  'link',
  'click',
  'gg',
  'ly',
  'tk',
] as const;

const SCHEME_OR_WWW = /https?:\/\/|www\./i;
// Unicode-aware boundaries: \b is ASCII-only in JS, so lookarounds are used instead. No `i` flag:
// the TLD must be lowercase in the original text, which spares "ASP.NET" and "job.Me".
const LABEL_TLD = new RegExp(
  `(?<![\\p{L}\\p{N}-])[\\p{L}\\p{N}-]+\\.(?:${LINK_TLDS.join('|')})(?![\\p{L}\\p{N}])`,
  'u',
);
// Tech names whose "TLD" is a real product name; removed before the label.tld test.
const LINK_ALLOWLIST = /(?<![\p{L}\p{N}-])socket\.io(?![\p{L}\p{N}]|\.[\p{L}\p{N}])/giu;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
const PHONE = /(?:\+?\d[\s.-]?){9,}/;

const NONE: ReadonlySet<number> = new Set();

// Forbidden: C0/C1 controls, bidi controls, zero-width space, word joiner, BOM.
// ZWJ (U+200D) is deliberately allowed: emoji sequences need it.
function isForbiddenCodeUnit(code: number): boolean {
  return (
    code <= 0x1f ||
    (code >= 0x7f && code <= 0x9f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069) ||
    code === 0x200b ||
    code === 0x2060 ||
    code === 0xfeff
  );
}

export function containsForbiddenCharacters(
  text: string,
  allowed: ReadonlySet<number> = NONE,
): boolean {
  // A lone surrogate (e.g. from a JSON \ud800 escape) is ill-formed text for SQLite and providers.
  if (!text.isWellFormed()) return true;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (!allowed.has(code) && isForbiddenCodeUnit(code)) return true;
  }
  return false;
}

export function containsLink(text: string): boolean {
  return SCHEME_OR_WWW.test(text) || LABEL_TLD.test(text.replace(LINK_ALLOWLIST, ' '));
}

export function containsContactInfo(text: string): boolean {
  return EMAIL.test(text) || PHONE.test(text);
}

// Whitespace controls that normalization collapses into a space, so they are not "forbidden" pre-collapse.
const COLLAPSIBLE_WHITESPACE: ReadonlySet<number> = new Set([0x09, 0x0a, 0x0b, 0x0c, 0x0d]);

/** NFC, trim, collapse whitespace runs. Prefer `checkGuestbookBody`, which also checks characters. */
export function normalizeGuestbookBody(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

function collectCodes(normalized: string, invalidCharacters: boolean): FieldErrorCode[] {
  const codes: FieldErrorCode[] = [];
  if (normalized.length === 0) codes.push('empty');
  if (normalized.length > GUESTBOOK_MESSAGE_MAX_LENGTH) codes.push('too_long');
  if (invalidCharacters) codes.push('invalid_characters');
  if (containsLink(normalized)) codes.push('links_not_allowed');
  if (containsContactInfo(normalized)) codes.push('contact_info_not_allowed');
  return codes;
}

/** Rules on already-normalized text. Does not see characters that normalization removed. */
export function validateGuestbookBody(normalized: string): FieldErrorCode[] {
  return collectCodes(normalized, containsForbiddenCharacters(normalized));
}

/**
 * Single entry point for a raw guestbook body. Order: NFC, character check on the NFC text
 * (before trim/collapse, because JS treats U+FEFF as whitespace and would silently drop it),
 * then trim/collapse, then length/link/contact rules. Callers should use this, not the two
 * halves separately.
 */
export function checkGuestbookBody(raw: string): { normalized: string; errors: FieldErrorCode[] } {
  const nfc = raw.normalize('NFC');
  const invalid = containsForbiddenCharacters(nfc, COLLAPSIBLE_WHITESPACE);
  const normalized = normalizeGuestbookBody(nfc);
  return { normalized, errors: collectCodes(normalized, invalid) };
}
