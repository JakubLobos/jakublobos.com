import { describe, expect, it } from 'vitest';
import {
  createContactService,
  type ContactCap,
  type ContactSubmission,
} from './contact.service.ts';
import { createFakeMailer } from './fake-mailer.ts';
import type { MailResult } from './mailer.port.ts';

const REQUEST_ID = '0b7f6d1e-5c0e-4a58-9d3a-3f0f3a1b2c4d';

function submission(overrides: Partial<ContactSubmission> = {}): ContactSubmission {
  return {
    name: 'Jane Doe',
    email: 'jane@example.com',
    message: 'Hello there, I like your portfolio.',
    clientRequestId: REQUEST_ID,
    ...overrides,
  };
}

function setup(options: { result?: MailResult; cap?: ContactCap } = {}) {
  const mailer = createFakeMailer(options.result);
  const cap = options.cap ?? { consume: () => ({ ok: true }) as const };
  return { mailer, service: createContactService({ mailer, cap }) };
}

describe('contact service validation', () => {
  it.each([
    [{ name: 'J' }, { name: ['too_short'] }],
    [{ name: 'J'.repeat(61) }, { name: ['too_long'] }],
    [{ name: 'Jane\u0007' }, { name: ['invalid_characters'] }],
    [{ email: '' }, { email: ['required'] }],
    [{ email: 'not-an-email' }, { email: ['invalid'] }],
    [{ email: `${'a'.repeat(116)}@b.co` }, { email: ['too_long'] }],
    [{ message: 'too short' }, { message: ['too_short'] }],
    [{ message: 'x'.repeat(1001) }, { message: ['too_long'] }],
    [{ message: 'bell\u0007 character here' }, { message: ['invalid_characters'] }],
  ])('rejects %j with %j and sends nothing', async (override, fields) => {
    const { service, mailer } = setup();
    expect(await service.send(submission(override))).toEqual({ kind: 'invalid', fields });
    expect(mailer.sent).toHaveLength(0);
  });

  it('accepts the exact boundaries', async () => {
    const { service } = setup();
    const outcome = await service.send(submission({ name: 'Jo', message: 'x'.repeat(10) }));
    expect(outcome).toEqual({ kind: 'sent' });
    const max = await service.send(submission({ name: 'N'.repeat(60), message: 'x'.repeat(1000) }));
    expect(max).toEqual({ kind: 'sent' });
  });
});

describe('contact service delivery', () => {
  it('builds the mail from normalized input and passes the idempotency key', async () => {
    const { service, mailer } = setup();
    await service.send(
      submission({ name: '  Łukasz Żółć ', email: ' luk@example.com ', locale: 'pl' }),
    );
    expect(mailer.sent).toHaveLength(1);
    const [first] = mailer.sent;
    expect(first?.idempotencyKey).toBe(REQUEST_ID);
    expect(first?.mail.replyTo).toBe('luk@example.com');
    expect(first?.mail.subject).toBe('Portfolio contact: Łukasz Żółć');
    expect(first?.mail.text).toBe(
      [
        'Name: Łukasz Żółć',
        'Email: luk@example.com',
        'Locale: pl',
        '',
        'Hello there, I like your portfolio.',
      ].join('\n'),
    );
  });

  it('builds a byte-identical mail for a retry of the same submission', async () => {
    // Resend answers 409 when a reused Idempotency-Key carries a different payload.
    const { service, mailer } = setup();
    await service.send(submission());
    await service.send(submission());
    expect(mailer.sent).toHaveLength(2);
    expect(mailer.sent[1]).toEqual(mailer.sent[0]);
  });

  it('defaults the locale to en', async () => {
    const { service, mailer } = setup();
    await service.send(submission());
    expect(mailer.sent[0]?.mail.text).toContain('Locale: en');
  });

  it('keeps CR/LF header injection out of the subject', async () => {
    // Validation rejects control characters, so bypass it with a lookalike that survives
    // normalization: the subject builder must still never emit a line break.
    const { service, mailer } = setup();
    await service.send(submission({ name: 'Jane \u2028Bcc: x@y.z' }));
    const subject = mailer.sent[0]?.mail.subject ?? '';
    expect(subject).not.toMatch(/[\r\n\u2028]/u);
    expect(subject.length).toBeLessThanOrEqual(80);
  });

  it('rejects CRLF in the name as invalid_characters before any mail is built', async () => {
    const { service, mailer } = setup();
    const outcome = await service.send(submission({ name: 'Jane\r\nBcc: x@y.z' }));
    expect(outcome).toEqual({ kind: 'invalid', fields: { name: ['invalid_characters'] } });
    expect(mailer.sent).toHaveLength(0);
  });

  it('drops honeypot submissions silently without spending the cap', async () => {
    let consumed = 0;
    const { service, mailer } = setup({
      cap: {
        consume: () => {
          consumed += 1;
          return { ok: true };
        },
      },
    });
    expect(await service.send(submission({ website: 'http://spam.example' }))).toEqual({
      kind: 'sent',
    });
    expect(mailer.sent).toHaveLength(0);
    expect(consumed).toBe(0);
  });

  it('reports the cap as unavailable with Retry-After and does not send', async () => {
    const { service, mailer } = setup({
      cap: { consume: () => ({ ok: false, retryAfterSeconds: 120 }) },
    });
    expect(await service.send(submission())).toEqual({
      kind: 'unavailable',
      reason: 'cap',
      retryAfterSeconds: 120,
    });
    expect(mailer.sent).toHaveLength(0);
  });

  it('maps every mailer failure to unavailable', async () => {
    const { service } = setup({ result: { ok: false, code: 'timeout' } });
    expect(await service.send(submission())).toEqual({ kind: 'unavailable', reason: 'timeout' });
  });
});
