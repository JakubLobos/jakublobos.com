import { describe, expect, it } from 'vitest';
import { MIN_THUMB, scrollForThumbDrag, scrollForTrackClick, thumbMetrics } from './scrollbar.ts';

const VIEWPORT = 800;
const TRACK = 772;
const DOC = 4000;
const MAX = DOC - VIEWPORT;

describe('thumbMetrics', () => {
  it('sits at the top of the track at scroll 0 and the bottom at max scroll', () => {
    const top = thumbMetrics(TRACK, VIEWPORT, DOC, 0);
    const bottom = thumbMetrics(TRACK, VIEWPORT, DOC, MAX);
    expect(top.offset).toBe(0);
    expect(bottom.offset).toBeCloseTo(TRACK - bottom.thumb, 9);
  });

  it('sizes the thumb by the visible fraction of the document', () => {
    expect(thumbMetrics(TRACK, VIEWPORT, DOC, 0).thumb).toBeCloseTo((TRACK * VIEWPORT) / DOC, 9);
  });

  it('never shrinks the thumb below the minimum or grows it past the track', () => {
    expect(thumbMetrics(TRACK, VIEWPORT, 1_000_000, 0).thumb).toBe(MIN_THUMB);
    expect(thumbMetrics(42, 70, 4000, 0).thumb).toBe(42);
  });

  it('clamps overscroll and wobbles with progress', () => {
    const over = thumbMetrics(TRACK, VIEWPORT, DOC, MAX + 500);
    expect(over.offset).toBeCloseTo(TRACK - over.thumb, 9);
    expect(thumbMetrics(TRACK, VIEWPORT, DOC, 0).rotation).toBe(0);
    expect(thumbMetrics(TRACK, VIEWPORT, DOC, MAX / 2).rotation).toBeCloseTo(
      Math.sin(4.5) * 1.2,
      9,
    );
  });

  it('reports a page within 2 px of the viewport as not scrollable', () => {
    expect(thumbMetrics(TRACK, VIEWPORT, VIEWPORT + 2, 0).scrollable).toBe(false);
    expect(thumbMetrics(TRACK, VIEWPORT, VIEWPORT + 3, 0).scrollable).toBe(true);
  });

  it('tolerates an empty document', () => {
    expect(thumbMetrics(TRACK, VIEWPORT, 0, 0).offset).toBe(0);
  });
});

describe('scrollForThumbDrag', () => {
  const travel = TRACK - thumbMetrics(TRACK, VIEWPORT, DOC, 0).thumb;

  it('maps a full thumb travel to the full document scroll', () => {
    expect(scrollForThumbDrag(TRACK, 0, travel, VIEWPORT, DOC)).toBeCloseTo(MAX, 9);
  });

  it('is proportional in between and clamped at both ends', () => {
    expect(scrollForThumbDrag(TRACK, 0, travel / 2, VIEWPORT, DOC)).toBeCloseTo(MAX / 2, 9);
    expect(scrollForThumbDrag(TRACK, 100, -999, VIEWPORT, DOC)).toBe(0);
    expect(scrollForThumbDrag(TRACK, 100, 99_999, VIEWPORT, DOC)).toBe(MAX);
  });

  it('stays put when the thumb fills the track', () => {
    expect(scrollForThumbDrag(42, 1, 50, 70, 4000)).toBe(1);
  });
});

describe('scrollForTrackClick', () => {
  const { thumb } = thumbMetrics(TRACK, VIEWPORT, DOC, 0);

  it('jumps to the proportional position with the thumb centred on the click', () => {
    expect(scrollForTrackClick(TRACK, thumb / 2, VIEWPORT, DOC)).toBe(0);
    expect(scrollForTrackClick(TRACK, TRACK - thumb / 2, VIEWPORT, DOC)).toBeCloseTo(MAX, 9);
    expect(scrollForTrackClick(TRACK, TRACK / 2, VIEWPORT, DOC)).toBeCloseTo(MAX / 2, 9);
  });

  it('clamps clicks on the end caps and ignores a full-height thumb', () => {
    expect(scrollForTrackClick(TRACK, -5, VIEWPORT, DOC)).toBe(0);
    expect(scrollForTrackClick(TRACK, TRACK + 5, VIEWPORT, DOC)).toBe(MAX);
    expect(scrollForTrackClick(42, 100, 70, 4000)).toBe(0);
  });
});
