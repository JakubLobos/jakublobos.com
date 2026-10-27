export const LOCALES = ['en', 'pl'] as const;
export const DEFAULT_LOCALE = 'en' satisfies (typeof LOCALES)[number];

export const PAINT_IDS = ['red', 'coral', 'yellow', 'purple', 'violet', 'blue'] as const;
export const DEFAULT_PAINT = 'yellow' satisfies (typeof PAINT_IDS)[number];

export const GUESTBOOK_MESSAGE_MAX_LENGTH = 120; // UTF-16 code units (= HTML maxlength)
export const GUESTBOOK_RETENTION_LIMIT = 100; // total rows (pending + approved)
export const GUESTBOOK_MAX_PENDING = 1; // newest wins (D-05)

export const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected', 'superseded'] as const;
/** Deliberately coarse (ADR-0017): enough to be kind to the visitor, too little to probe the filters. */
export const SUBMISSION_REASONS = [
  'inappropriate',
  'off_topic',
  'impersonation',
  'personal_data',
] as const;

export const CONTACT_NAME_MIN = 2;
export const CONTACT_NAME_MAX = 60;
export const CONTACT_EMAIL_MAX = 120;
export const CONTACT_MESSAGE_MIN = 10;
export const CONTACT_MESSAGE_MAX = 1000;

export const ERROR_CODES = [
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
  'INTERNAL',
] as const;

export const FIELD_ERROR_CODES = [
  'required',
  'empty',
  'too_short',
  'too_long',
  'invalid',
  'invalid_characters',
  'links_not_allowed',
  'contact_info_not_allowed',
] as const;
