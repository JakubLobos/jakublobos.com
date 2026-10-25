import { z } from 'zod';
import {
  CONTACT_EMAIL_MAX,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
  ERROR_CODES,
  FIELD_ERROR_CODES,
  GUESTBOOK_MESSAGE_MAX_LENGTH,
  LOCALES,
  PAINT_IDS,
} from './constants.ts';

// Request schemas check shape and types only. The raw cap (4x the limit) merely
// bounds work; the semantic rules live in ./rules and run after normalization.
const RAW_FACTOR = 4;
const HONEYPOT_MAX = 500;

export const PaintIdSchema = z.enum(PAINT_IDS);
export const LocaleSchema = z.enum(LOCALES);
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export const FieldErrorCodeSchema = z.enum(FIELD_ERROR_CODES);

export const GuestbookSubmitRequestSchema = z.object({
  body: z.string().max(GUESTBOOK_MESSAGE_MAX_LENGTH * RAW_FACTOR),
  paint: PaintIdSchema,
  clientRequestId: z.uuid(),
  locale: LocaleSchema.optional(),
  website: z.string().max(HONEYPOT_MAX).optional(),
});

export const GuestbookSubmitResponseSchema = z.object({
  data: z.object({ status: z.literal('received') }),
});

export const GuestbookMessageDtoSchema = z.object({
  id: z.uuid(),
  body: z.string(),
  paint: PaintIdSchema,
  publishedAt: z.iso.datetime(),
});

export const GuestbookLatestResponseSchema = z.object({
  data: z.object({ message: GuestbookMessageDtoSchema.nullable() }),
});

export const ContactRequestSchema = z.object({
  name: z.string().max(CONTACT_NAME_MAX * RAW_FACTOR),
  email: z.string().max(CONTACT_EMAIL_MAX * RAW_FACTOR),
  message: z.string().max(CONTACT_MESSAGE_MAX * RAW_FACTOR),
  clientRequestId: z.uuid(),
  locale: LocaleSchema.optional(),
  website: z.string().max(HONEYPOT_MAX).optional(),
});

export const ContactResponseSchema = z.object({
  data: z.object({ status: z.literal('sent') }),
});

export const PhoneRevealRequestSchema = z.object({
  turnstileToken: z.string().min(1).max(4096),
});

export const PhoneRevealResponseSchema = z.object({
  data: z.object({ display: z.string(), tel: z.string() }),
});

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    fields: z.record(z.string(), z.array(FieldErrorCodeSchema)).optional(),
    requestId: z.string().optional(),
  }),
});
