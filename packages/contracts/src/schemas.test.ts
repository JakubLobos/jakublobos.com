import { describe, expect, it } from 'vitest';
import {
  ApiErrorBodySchema,
  ContactRequestSchema,
  ContactResponseSchema,
  ErrorCodeSchema,
  FieldErrorCodeSchema,
  GuestbookLatestResponseSchema,
  GuestbookSubmitRequestSchema,
  GuestbookSubmitResponseSchema,
  PhoneRevealRequestSchema,
  PhoneRevealResponseSchema,
} from './schemas.ts';

const uuid = 'd1b7c0b4-3f1e-4d6c-9a52-2b9f0b8f61a1';

describe('guestbook schemas', () => {
  const valid = {
    body: 'Hello from Kraków!',
    paint: 'violet',
    clientRequestId: uuid,
    locale: 'pl',
    website: '',
  };

  it('accepts the api.md example', () => {
    expect(GuestbookSubmitRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a request without the honeypot field', () => {
    const { website: _website, ...rest } = valid;
    expect(GuestbookSubmitRequestSchema.safeParse(rest).success).toBe(true);
  });

  it.each([
    ['wrong body type', { ...valid, body: 5 }],
    ['unknown paint', { ...valid, paint: 'green' }],
    ['non-uuid id', { ...valid, clientRequestId: 'abc' }],
    ['oversized body', { ...valid, body: 'a'.repeat(481) }],
    ['oversized honeypot', { ...valid, website: 'a'.repeat(501) }],
    ['missing paint', { body: 'x', clientRequestId: uuid }],
  ])('rejects %s', (_label, input) => {
    expect(GuestbookSubmitRequestSchema.safeParse(input).success).toBe(false);
  });

  it('accepts raw body at exactly 4x the limit', () => {
    expect(
      GuestbookSubmitRequestSchema.safeParse({ ...valid, body: 'a'.repeat(480) }).success,
    ).toBe(true);
  });

  it('accepts the response examples', () => {
    expect(GuestbookSubmitResponseSchema.safeParse({ data: { status: 'received' } }).success).toBe(
      true,
    );
    expect(
      GuestbookLatestResponseSchema.safeParse({
        data: {
          message: {
            id: '0b7a2c1e-5d3f-4a6b-8c9d-0e1f2a3b4c5d',
            body: 'Love the paint drips!',
            paint: 'yellow',
            publishedAt: '2026-10-25T12:00:00.000Z',
          },
        },
      }).success,
    ).toBe(true);
    expect(GuestbookLatestResponseSchema.safeParse({ data: { message: null } }).success).toBe(true);
  });

  it('rejects malformed latest responses', () => {
    expect(GuestbookLatestResponseSchema.safeParse({ data: {} }).success).toBe(false);
    expect(
      GuestbookLatestResponseSchema.safeParse({
        data: { message: { id: 'x', body: 'b', paint: 'red', publishedAt: 'yesterday' } },
      }).success,
    ).toBe(false);
  });
});

describe('contact schemas', () => {
  const valid = {
    name: 'Jane Doe',
    email: 'jane@company.com',
    message: "I'd love to talk about...",
    clientRequestId: uuid,
    website: '',
  };

  it('accepts the api.md example and response', () => {
    expect(ContactRequestSchema.safeParse(valid).success).toBe(true);
    expect(ContactResponseSchema.safeParse({ data: { status: 'sent' } }).success).toBe(true);
  });

  it.each([
    ['name type', { ...valid, name: 1 }],
    ['oversized name', { ...valid, name: 'a'.repeat(241) }],
    ['oversized email', { ...valid, email: 'a'.repeat(481) }],
    ['oversized message', { ...valid, message: 'a'.repeat(4001) }],
    ['non-uuid id', { ...valid, clientRequestId: 'nope' }],
  ])('rejects %s', (_label, input) => {
    expect(ContactRequestSchema.safeParse(input).success).toBe(false);
  });
});

describe('phone reveal schemas', () => {
  it('accepts valid payloads', () => {
    expect(PhoneRevealRequestSchema.safeParse({ turnstileToken: '0.AbC' }).success).toBe(true);
    expect(
      PhoneRevealResponseSchema.safeParse({
        data: { display: '+48 000 000 000', tel: '+48000000000' },
      }).success,
    ).toBe(true);
  });

  it('rejects empty or missing tokens and incomplete responses', () => {
    expect(PhoneRevealRequestSchema.safeParse({ turnstileToken: '' }).success).toBe(false);
    expect(PhoneRevealRequestSchema.safeParse({}).success).toBe(false);
    expect(PhoneRevealResponseSchema.safeParse({ data: { display: 'x' } }).success).toBe(false);
  });
});

describe('error schemas', () => {
  it('accepts the api.md error envelope', () => {
    expect(
      ApiErrorBodySchema.safeParse({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          fields: { body: ['links_not_allowed'] },
          requestId: '4f1c',
        },
      }).success,
    ).toBe(true);
    expect(
      ApiErrorBodySchema.safeParse({ error: { code: 'INTERNAL', message: 'x' } }).success,
    ).toBe(true);
  });

  it('rejects unknown codes', () => {
    expect(ErrorCodeSchema.safeParse('NOPE').success).toBe(false);
    expect(FieldErrorCodeSchema.safeParse('nope').success).toBe(false);
    expect(
      ApiErrorBodySchema.safeParse({
        error: { code: 'INTERNAL', message: 'x', fields: { body: ['nope'] } },
      }).success,
    ).toBe(false);
  });

  it('includes the phone-reveal error codes', () => {
    expect(ErrorCodeSchema.safeParse('VERIFICATION_FAILED').success).toBe(true);
    expect(ErrorCodeSchema.safeParse('VERIFICATION_UNAVAILABLE').success).toBe(true);
  });
});

describe('locale field', () => {
  const gb = { body: 'hi', paint: 'red', clientRequestId: uuid };
  const ct = {
    name: 'Jane',
    email: 'jane@company.com',
    message: 'hello there',
    clientRequestId: uuid,
  };

  it.each([
    ['guestbook', GuestbookSubmitRequestSchema, gb],
    ['contact', ContactRequestSchema, ct],
  ])('%s accepts en, pl and absent locale, rejects others', (_n, schema, base) => {
    expect(schema.safeParse({ ...base, locale: 'pl' }).success).toBe(true);
    expect(schema.safeParse({ ...base, locale: 'en' }).success).toBe(true);
    expect(schema.safeParse(base).success).toBe(true);
    expect(schema.safeParse({ ...base, locale: 'de' }).success).toBe(false);
    expect(schema.safeParse({ ...base, locale: 5 }).success).toBe(false);
  });
});
