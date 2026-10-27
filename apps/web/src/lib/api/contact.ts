import type { ContactRequest, ContactResponse } from '@portfolio/contracts';
import { request, type ApiResult, type Guard } from './client.ts';

type Sent = ContactResponse['data'];

const isSent: Guard<Sent> = (value): value is Sent =>
  typeof value === 'object' && value !== null && 'status' in value && value.status === 'sent';

export function sendContactMessage(body: ContactRequest): Promise<ApiResult<Sent>> {
  return request('/api/contact', { method: 'POST', body }, isSent);
}
