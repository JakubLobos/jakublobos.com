import { PAINT_IDS, type PaintId } from '@portfolio/contracts';
import { PAINTS } from './paints.ts';

export function isPaintId(value: unknown): value is PaintId {
  return PAINT_IDS.some((id) => id === value);
}

/** Value for the `--tint` custom property that the marker highlight reads (ui/Highlight.astro). */
export function tintValue(paint: PaintId): string {
  return `var(${PAINTS[paint].tintVar})`;
}
