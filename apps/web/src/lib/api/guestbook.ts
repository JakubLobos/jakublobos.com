import type { GuestbookMessageDto, GuestbookSubmitRequest } from '@portfolio/contracts';
import { isPaintId } from '../guestbook-paint.ts';
import { request, type ApiResult, type Guard } from './client.ts';

export interface GuestbookLatestData {
  message: GuestbookMessageDto | null;
}

export interface GuestbookSubmitData {
  status: 'received';
}

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

export function getLatestGuestbookMessage(): Promise<ApiResult<GuestbookLatestData>> {
  return request('/api/guestbook/latest', { timeoutMs: LATEST_TIMEOUT_MS }, isLatest);
}

export function submitGuestbookMessage(
  input: GuestbookSubmitRequest,
): Promise<ApiResult<GuestbookSubmitData>> {
  return request('/api/guestbook', { method: 'POST', body: input }, isSubmitted);
}
