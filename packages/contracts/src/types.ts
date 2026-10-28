import type { z } from 'zod';
import type {
  ERROR_CODES,
  FIELD_ERROR_CODES,
  LOCALES,
  PAINT_IDS,
  SUBMISSION_REASONS,
  SUBMISSION_STATUSES,
} from './constants.ts';
import type {
  ApiErrorBodySchema,
  ContactRequestSchema,
  ContactResponseSchema,
  GuestbookLatestResponseSchema,
  GuestbookMessageDtoSchema,
  GuestbookSubmissionStatusResponseSchema,
  GuestbookSubmitRequestSchema,
  GuestbookSubmitResponseSchema,
  PhoneRevealRequestSchema,
  PhoneRevealResponseSchema,
  ResumeRequestSchema,
} from './schemas.ts';

export type Locale = (typeof LOCALES)[number];
export type PaintId = (typeof PAINT_IDS)[number];
export type ErrorCode = (typeof ERROR_CODES)[number];
export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

export type GuestbookSubmitRequest = z.infer<typeof GuestbookSubmitRequestSchema>;
export type GuestbookSubmitResponse = z.infer<typeof GuestbookSubmitResponseSchema>;
export type GuestbookMessageDto = z.infer<typeof GuestbookMessageDtoSchema>;
export type GuestbookLatestResponse = z.infer<typeof GuestbookLatestResponseSchema>;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export type SubmissionReason = (typeof SUBMISSION_REASONS)[number];
export type GuestbookSubmissionStatusResponse = z.infer<
  typeof GuestbookSubmissionStatusResponseSchema
>;
export type ContactRequest = z.infer<typeof ContactRequestSchema>;
export type ContactResponse = z.infer<typeof ContactResponseSchema>;
export type PhoneRevealRequest = z.infer<typeof PhoneRevealRequestSchema>;
export type PhoneRevealResponse = z.infer<typeof PhoneRevealResponseSchema>;
export type ResumeRequest = z.infer<typeof ResumeRequestSchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
export interface ApiSuccess<T> {
  data: T;
}
