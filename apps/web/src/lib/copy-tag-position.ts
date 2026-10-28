// Where the "Copied!" tag sits next to the link that was activated. Pure: the DOM reads live in
// scripts/copy-toast.ts.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TagPlacement {
  left: number;
  top: number;
  /** Which side of the anchor the tag landed on. */
  side: 'above' | 'below';
}

const GAP = 10;
const EDGE = 8;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Centred above the anchor, flipped below when there is no room, and always inside the viewport
 * (an anchor at the screen edge, like the vertical social link, would otherwise push it out).
 */
export function placeCopyTag(
  anchor: Box,
  tag: Pick<Box, 'width' | 'height'>,
  viewport: Pick<Box, 'width' | 'height'>,
): TagPlacement {
  const above = anchor.top - GAP - tag.height;
  const side = above >= EDGE ? 'above' : 'below';
  const top = side === 'above' ? above : anchor.top + anchor.height + GAP;
  const centred = anchor.left + anchor.width / 2 - tag.width / 2;
  return {
    left: clamp(centred, EDGE, Math.max(EDGE, viewport.width - tag.width - EDGE)),
    top: clamp(top, EDGE, Math.max(EDGE, viewport.height - tag.height - EDGE)),
    side,
  };
}
