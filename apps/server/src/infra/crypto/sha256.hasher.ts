import { createHash } from 'node:crypto';
import type { Hasher } from '../../domain/guestbook/normalize.ts';

export const sha256Hasher: Hasher = {
  sha256Hex: (text) => createHash('sha256').update(text, 'utf8').digest('hex'),
};
