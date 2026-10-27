import type { PaintId } from '@portfolio/contracts';
import type { ApiResult } from './api/client.ts';
import type { GuestbookLatestData } from './api/guestbook.ts';

/** What the "last visitor" block shows; `loading` is the static HTML default and never produced here. */
export type LatestView =
  { state: 'message'; body: string; paint: PaintId } | { state: 'empty' } | { state: 'error' };

/** Every failure kind collapses into one muted error line: a visitor never sees a raw error. */
export function toLatestView(result: ApiResult<GuestbookLatestData>): LatestView {
  if (!result.ok) return { state: 'error' };
  const { message } = result.data;
  return message
    ? { state: 'message', body: message.body, paint: message.paint }
    : { state: 'empty' };
}
