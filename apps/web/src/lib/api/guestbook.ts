import {
  SUBMISSION_REASONS,
  SUBMISSION_STATUSES,
  type GuestbookMessageDto,
  type GuestbookSubmissionStatusResponse,
  type GuestbookSubmitRequest,
} from '@portfolio/contracts';
import { isPaintId } from '../guestbook-paint.ts';
import { request, type ApiResult, type Guard } from './client.ts';

export interface GuestbookLatestData {
  message: GuestbookMessageDto | null;
}

export interface GuestbookSubmitData {
  status: 'received';
}

export type GuestbookStatusData = GuestbookSubmissionStatusResponse['data'];

/** The latest message is page chrome: fail fast and show the error state instead of waiting. */
export const LATEST_TIMEOUT_MS = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMessage(value: unknown): value is GuestbookMessageDto {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.body === 'string' &&
    isPaintId(value.paint) &&
    typeof value.publishedAt === 'string'
  );
}

export const isLatest: Guard<GuestbookLatestData> = (value): value is GuestbookLatestData =>
  isRecord(value) && (value.message === null || isMessage(value.message));

export const isSubmitted: Guard<GuestbookSubmitData> = (value): value is GuestbookSubmitData =>
  isRecord(value) && value.status === 'received';

/** One status poll must not outlive the next scheduled one by much. */
export const STATUS_TIMEOUT_MS = 8_000;

export const isSubmissionStatus: Guard<GuestbookSubmissionStatusResponse['data']> = (
  value,
): value is GuestbookSubmissionStatusResponse['data'] => {
  if (!isRecord(value)) return false;
  const { status, reason } = value;
  if (!SUBMISSION_STATUSES.some((known) => known === status)) return false;
  return reason === undefined || SUBMISSION_REASONS.some((known) => known === reason);
};

export function getSubmissionStatus(
  clientRequestId: string,
): Promise<ApiResult<GuestbookSubmissionStatusResponse['data']>> {
  return request(
    `/api/guestbook/submissions/${encodeURIComponent(clientRequestId)}`,
    { timeoutMs: STATUS_TIMEOUT_MS },
    isSubmissionStatus,
  );
}

export function getLatestGuestbookMessage(): Promise<ApiResult<GuestbookLatestData>> {
  return request('/api/guestbook/latest', { timeoutMs: LATEST_TIMEOUT_MS }, isLatest);
}

export function submitGuestbookMessage(
  input: GuestbookSubmitRequest,
): Promise<ApiResult<GuestbookSubmitData>> {
  return request('/api/guestbook', { method: 'POST', body: input }, isSubmitted);
}
