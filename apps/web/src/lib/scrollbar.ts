// Pure geometry for the custom scrollbar (design-source.html L463-488). The caller measures the
// track from the laid-out element, so CSS stays the single source for its length.
export const MIN_THUMB = 56;
// Sub-pixel rounding can leave a page 1-2 px taller than the viewport; that isn't scrollable.
const SCROLLABLE_SLACK = 2;
const WOBBLE_DEG = 1.2;
const WOBBLE_FREQUENCY = 9;

export interface ThumbMetrics {
  thumb: number;
  /** Thumb top relative to the track top: 0 at scroll top, `track - thumb` at the bottom. */
  offset: number;
  /** Hand-drawn tilt in degrees; a function of progress so it moves with scroll. */
  rotation: number;
  scrollable: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function thumbLength(track: number, viewportH: number, docH: number): number {
  const proportional = (track * viewportH) / Math.max(docH, 1);
  return Math.min(track, Math.max(MIN_THUMB, proportional));
}

function maxScroll(viewportH: number, docH: number): number {
  return Math.max(0, docH - viewportH);
}

export function thumbMetrics(
  track: number,
  viewportH: number,
  docH: number,
  scrollY: number,
): ThumbMetrics {
  const thumb = thumbLength(track, viewportH, docH);
  const max = maxScroll(viewportH, docH);
  const progress = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
  return {
    thumb,
    offset: progress * (track - thumb),
    rotation: Math.sin(progress * WOBBLE_FREQUENCY) * WOBBLE_DEG,
    scrollable: docH > viewportH + SCROLLABLE_SLACK,
  };
}

/** Document scroll position after the thumb moved `deltaY` px from where it was at `startScrollY`. */
export function scrollForThumbDrag(
  track: number,
  startScrollY: number,
  deltaY: number,
  viewportH: number,
  docH: number,
): number {
  const travel = track - thumbLength(track, viewportH, docH);
  const max = maxScroll(viewportH, docH);
  if (travel <= 0) return clamp(startScrollY, 0, max);
  return clamp(startScrollY + deltaY * (max / travel), 0, max);
}

/** Scroll target for a click `offsetY` px below the track top; the thumb centres on the click. */
export function scrollForTrackClick(
  track: number,
  offsetY: number,
  viewportH: number,
  docH: number,
): number {
  const thumb = thumbLength(track, viewportH, docH);
  const travel = track - thumb;
  if (travel <= 0) return 0;
  return clamp((offsetY - thumb / 2) / travel, 0, 1) * maxScroll(viewportH, docH);
}
