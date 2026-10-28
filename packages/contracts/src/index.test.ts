import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as contracts from './index.ts';

describe('constants (api.md section 2)', () => {
  it('exports the exact values', () => {
    expect(contracts.LOCALES).toEqual(['en', 'pl']);
    expect(contracts.DEFAULT_LOCALE).toBe('en');
    expect(contracts.PAINT_IDS).toEqual(['red', 'coral', 'yellow', 'purple', 'violet', 'blue']);
    expect(contracts.DEFAULT_PAINT).toBe('yellow');
    expect(contracts.GUESTBOOK_MESSAGE_MAX_LENGTH).toBe(120);
    expect(contracts.GUESTBOOK_RETENTION_LIMIT).toBe(100);
    expect(contracts.GUESTBOOK_MAX_PENDING).toBe(1);
    expect(contracts.CONTACT_NAME_MIN).toBe(2);
    expect(contracts.CONTACT_NAME_MAX).toBe(60);
    expect(contracts.CONTACT_EMAIL_MAX).toBe(120);
    expect(contracts.CONTACT_MESSAGE_MIN).toBe(10);
    expect(contracts.CONTACT_MESSAGE_MAX).toBe(1000);
  });

  it('lists every error and field error code from api.md', () => {
    expect([...contracts.ERROR_CODES].sort()).toEqual(
      [
        'INVALID_JSON',
        'FORBIDDEN_ORIGIN',
        'NOT_FOUND',
        'PAYLOAD_TOO_LARGE',
        'UNSUPPORTED_MEDIA_TYPE',
        'VALIDATION_FAILED',
        'RATE_LIMITED',
        'GUESTBOOK_BUSY',
        'MAIL_UNAVAILABLE',
        'VERIFICATION_FAILED',
        'VERIFICATION_UNAVAILABLE',
        'RESUME_UNAVAILABLE',
        'INTERNAL',
      ].sort(),
    );
    expect(contracts.FIELD_ERROR_CODES).toEqual([
      'required',
      'empty',
      'too_short',
      'too_long',
      'invalid',
      'invalid_characters',
      'links_not_allowed',
      'contact_info_not_allowed',
    ]);
  });
});

describe('index.ts bundle hygiene', () => {
  it('has no value import from schemas.ts or zod (keeps zod out of web bundles)', () => {
    const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from\s+['"]\.\/schemas(\.ts)?['"]/);
    expect(source).not.toMatch(/from\s+['"]zod['"]/);
  });

  it('does not expose schemas at runtime', () => {
    expect('GuestbookSubmitRequestSchema' in contracts).toBe(false);
  });

  it('keeps rules and constants free of zod imports', () => {
    for (const file of [
      './constants.ts',
      './rules/guestbook-content.ts',
      './rules/contact-fields.ts',
    ]) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      expect(source).not.toMatch(/from\s+['"]zod['"]/);
      expect(source).not.toMatch(/import\s+(?!type)[^;]*schemas/);
    }
  });
});
