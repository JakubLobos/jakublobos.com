import {
  CONTACT_EMAIL_MAX,
  CONTACT_MESSAGE_MAX,
  CONTACT_MESSAGE_MIN,
  CONTACT_NAME_MAX,
  CONTACT_NAME_MIN,
} from '../constants.ts';
import type { FieldErrorCode } from '../types.ts';
import { containsForbiddenCharacters } from './guestbook-content.ts';

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}
export type ContactFieldErrors = Partial<Record<keyof ContactInput, FieldErrorCode[]>>;

// Identical to the design's client-side check (design-source.html).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MESSAGE_ALLOWED: ReadonlySet<number> = new Set([0x0a, 0x09]);

export function normalizeContactInput(raw: ContactInput): ContactInput {
  return {
    name: raw.name.normalize('NFC').trim(),
    email: raw.email.trim(),
    message: raw.message.normalize('NFC').replace(/\r\n?/gu, '\n').trim(),
  };
}

export function validateContactInput(normalized: ContactInput): ContactFieldErrors {
  const { name, email, message } = normalized;
  const errors: ContactFieldErrors = {};

  const nameCodes: FieldErrorCode[] = [];
  if (name.length < CONTACT_NAME_MIN) nameCodes.push('too_short');
  if (name.length > CONTACT_NAME_MAX) nameCodes.push('too_long');
  if (containsForbiddenCharacters(name)) nameCodes.push('invalid_characters');
  if (nameCodes.length > 0) errors.name = nameCodes;

  const emailCodes: FieldErrorCode[] = [];
  if (email.length === 0) {
    emailCodes.push('required');
  } else {
    if (email.length > CONTACT_EMAIL_MAX) emailCodes.push('too_long');
    if (!EMAIL_RE.test(email)) emailCodes.push('invalid');
  }
  if (emailCodes.length > 0) errors.email = emailCodes;

  const messageCodes: FieldErrorCode[] = [];
  if (message.length < CONTACT_MESSAGE_MIN) messageCodes.push('too_short');
  if (message.length > CONTACT_MESSAGE_MAX) messageCodes.push('too_long');
  if (containsForbiddenCharacters(message, MESSAGE_ALLOWED)) {
    messageCodes.push('invalid_characters');
  }
  if (messageCodes.length > 0) errors.message = messageCodes;

  return errors;
}
