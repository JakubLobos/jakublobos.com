import { CONTACT_MESSAGE_MAX, CONTACT_NAME_MAX } from '@portfolio/contracts';
import { describe, expect, it } from 'vitest';
import { parseContactDraft, serializeContactDraft } from './contact-draft.ts';

const values = { name: ' Ada ', email: 'ada@example.com', message: 'Hello\n  there ' };

describe('contact draft', () => {
  it('round-trips the raw values without normalizing them', () => {
    expect(parseContactDraft(serializeContactDraft(values))).toEqual(values);
  });

  it('stores nothing when every field is empty', () => {
    expect(serializeContactDraft({ name: '', email: '', message: '' })).toBeNull();
    expect(serializeContactDraft({ name: '', email: '', message: 'x' })).not.toBeNull();
  });

  it('discards malformed or foreign data', () => {
    for (const raw of [
      null,
      '',
      '{not json',
      'null',
      '"text"',
      '[]',
      JSON.stringify({ name: 'a', email: 'b', message: 'c' }),
      JSON.stringify({ v: 2, name: 'a', email: 'b', message: 'c' }),
      JSON.stringify({ v: 1, name: 'a', email: 2, message: 'c' }),
      JSON.stringify({ v: 1, name: 'a', email: 'b' }),
    ]) {
      expect(parseContactDraft(raw)).toBeNull();
    }
  });

  it('clamps over-long strings to the field limits', () => {
    const raw = JSON.stringify({
      v: 1,
      name: 'n'.repeat(CONTACT_NAME_MAX + 50),
      email: 'e',
      message: 'm'.repeat(CONTACT_MESSAGE_MAX * 3),
    });
    const draft = parseContactDraft(raw);
    expect(draft?.name).toHaveLength(CONTACT_NAME_MAX);
    expect(draft?.message).toHaveLength(CONTACT_MESSAGE_MAX);
  });
});
