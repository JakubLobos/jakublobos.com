import { PAINT_IDS, type PaintId } from '@portfolio/contracts';

export interface PaintInfo {
  swatchVar: `--paint-${PaintId}`;
  tintVar: `--paint-${PaintId}-tint`;
  /** Message key for the colour name; the copy lives in the guestbook message module. */
  labelKey: `guestbook.paint.${PaintId}`;
}

export const PAINTS: Record<PaintId, PaintInfo> = {
  red: { swatchVar: '--paint-red', tintVar: '--paint-red-tint', labelKey: 'guestbook.paint.red' },
  coral: {
    swatchVar: '--paint-coral',
    tintVar: '--paint-coral-tint',
    labelKey: 'guestbook.paint.coral',
  },
  yellow: {
    swatchVar: '--paint-yellow',
    tintVar: '--paint-yellow-tint',
    labelKey: 'guestbook.paint.yellow',
  },
  purple: {
    swatchVar: '--paint-purple',
    tintVar: '--paint-purple-tint',
    labelKey: 'guestbook.paint.purple',
  },
  violet: {
    swatchVar: '--paint-violet',
    tintVar: '--paint-violet-tint',
    labelKey: 'guestbook.paint.violet',
  },
  blue: {
    swatchVar: '--paint-blue',
    tintVar: '--paint-blue-tint',
    labelKey: 'guestbook.paint.blue',
  },
};

/** Design order (also the drip order); the contracts constant is the source of truth. */
export const PAINT_ORDER: readonly PaintId[] = PAINT_IDS;
