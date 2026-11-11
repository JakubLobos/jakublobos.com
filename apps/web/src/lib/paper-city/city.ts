// Generates the paper city as GPU-ready buffers. Everything the renderer animates (the intro wave,
// the wireframe-then-paper build, the idle rebuilds, the cars) is driven in the vertex shader by
// time and a per-object state texel, so the whole city draws in one fill call and one line call.
// Positions are "flat" world coordinates; the shader bends them onto the ground cylinder.
import { CAMERA } from './camera.ts';
import {
  ACCENT_COUNT,
  Builder,
  FILL_STRIDE,
  KIND,
  LINE_STRIDE,
  MAT,
  STYLE,
  type Style,
} from './geometry.ts';
import { between, createRng, type Rng } from './rng.ts';

/** The chosen city. Changing it redraws every building, so treat it like a design asset. */
export const CITY_SEED = 20261111;

const BLOCK = 11;
const ROAD = 3.4;
const AVENUE = 7;
const PITCH = BLOCK + ROAD;
const ROWS = 9;
const COLS = 7;
const SLAB_H = 0.22;

/** State texture width; object `n` lives at texel (n % width, n / width). */
export const STATE_WIDTH = 256;

// Fixed buffer slot per building, so an idle rebuild rewrites its slot in place. Worst cases:
// seven boxes (20 vertices, 30 indices, 12 edges each) plus the cap quad; ink beyond the first
// stroke is skipped when a slot is full, and the wireframe needs at most 80 segments.
export const LOT_VERTICES = 144;
export const LOT_INDICES = 216;
export const LOT_LINE_VERTICES = 7 * 12 * 2 + 8 + 160 + 96;

const INTRO_START = 0.1;
/** The intro finishes building by about this time (s); idle rebuilds start after it. */
export const INTRO_END = 4.5;
const BUILD_TIME = 1.95;
const STRIP_TIME = 1;

export interface Lot {
  readonly obj: number;
  readonly slot: number;
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly big: boolean;
  /** Row (front to back) and column, used for heights and the idle pool. */
  readonly j: number;
  readonly i: number;
}

export interface City {
  readonly fill: Float32Array;
  readonly index: Uint32Array;
  readonly lines: Float32Array;
  /** RGBA32F texels. Slab: start. Building: build start, strip start (-1 = none), y0, y1. Car: axis, start, velocity. */
  readonly state: Float32Array;
  readonly lots: readonly Lot[];
  /** Vertex / index / line-vertex offsets where the building slots start. */
  readonly base: { readonly fill: number; readonly index: number; readonly lines: number };
}

function height(lot: Lot, rng: Rng): number {
  if (lot.big) return between(rng, 1.6, 3);
  const r = rng();
  let h = r < 0.55 ? between(rng, 1.6, 4) : r < 0.88 ? between(rng, 4, 7.5) : between(rng, 7.5, 12);
  // The first column frames the avenue; tall buildings there would wall off the view.
  if (lot.j <= 3 && lot.i === 0) h = Math.min(h, between(rng, 1.6, 3.4));
  return h;
}

function building(b: Builder, rng: Rng, lot: Lot): void {
  const { x, z, w, d } = lot;
  const h = height(lot, rng);
  const style = lot.big ? 3 : 1 + Math.floor(rng() * 3);
  let cw = w;
  let cd = d;
  if (h > 6 && rng() < 0.5) b.box(MAT.paper, x, SLAB_H, z, w + 0.5, 0.9, d + 0.5);
  b.box(style, x, SLAB_H, z, w, h, d);
  let y = SLAB_H + h;
  b.box(MAT.paper, x, y, z, w + 0.18, 0.2, d + 0.18);
  y += 0.2;
  if (h > 9 && rng() < 0.55) {
    cw = w * between(rng, 0.6, 0.78);
    cd = d * between(rng, 0.6, 0.78);
    const h2 = h * between(rng, 0.14, 0.28);
    b.box(style, x, y, z, cw, h2, cd);
    y += h2;
    b.box(MAT.paper, x, y, z, cw + 0.16, 0.18, cd + 0.16);
    y += 0.18;
  }
  const r = rng();
  if (h > 10 && r < 0.35) {
    const s = Math.min(cw, cd) * 0.42;
    const ph = between(rng, 1.4, 3);
    const roof = rng() < 0.35 ? MAT.accent + Math.floor(rng() * ACCENT_COUNT) : MAT.paper;
    b.pyramid(roof, x, y, z, s, ph);
    if (rng() < 0.5) b.box(MAT.paper, x, y + ph * 0.6, z, 0.09, between(rng, 1.5, 3), 0.09);
  } else if (h > 7 && r < 0.55) {
    b.box(MAT.roof, x, y, z, cw * 0.4, 0.5, cd * 0.4);
    b.box(MAT.paper, x, y + 0.5, z, 0.08, between(rng, 2, 4), 0.08);
  } else {
    const n = 1 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      b.box(
        MAT.roof,
        x + between(rng, -cw / 4, cw / 4),
        y,
        z + between(rng, -cd / 4, cd / 4),
        between(rng, 0.4, 1),
        between(rng, 0.25, 0.5),
        between(rng, 0.4, 0.9),
      );
    }
  }
}

/** Builds one building, its paper cap and its wireframe; returns its vertical extent. */
function lotGeometry(lot: Lot, rng: Rng): { b: Builder; y0: number; y1: number } {
  const b = new Builder();
  b.kind = KIND.body;
  b.obj = lot.obj;
  building(b, rng, lot);
  let [x0, x1, z0, z1, y1] = [Infinity, -Infinity, Infinity, -Infinity, -Infinity];
  for (let k = 0; k < b.fill.length; k += FILL_STRIDE) {
    const [x, y, z] = [b.fill[k] ?? 0, b.fill[k + 1] ?? 0, b.fill[k + 2] ?? 0];
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    z0 = Math.min(z0, z);
    z1 = Math.max(z1, z);
    y1 = Math.max(y1, y);
  }
  const y0 = SLAB_H;
  const e = 0.04;
  [x0, x1, z0, z1] = [x0 - e, x1 + e, z0 - e, z1 + e];
  const wireBudget = 160;
  const capBudget = 8;
  b.ink(rng, LOT_LINE_VERTICES - wireBudget - capBudget);

  // The sheet of paper riding on the clip plane while the building fills in.
  b.kind = KIND.cap;
  b.inked = false;
  b.quad(MAT.paper, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0]);
  const corners: [number, number][] = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  const rect = (y: number, style: Style): void => {
    corners.forEach(([ax, az], k) => {
      const [bx, bz] = corners[(k + 1) % 4] ?? [ax, az];
      b.line([ax, y, az], [bx, y, bz], style);
    });
  };
  rect(0, STYLE.cap);

  b.kind = KIND.wire;
  for (const [x, z] of corners) b.line([x, y0, z], [x, y1, z], STYLE.wire);
  rect(y0, STYLE.wire);
  for (let y = y0 + 1.2; y < y1 - 0.4; y += 1.2) rect(y, STYLE.wire);
  rect(y1, STYLE.wire);
  return { b, y0, y1 };
}

export interface LotUpload {
  readonly obj: number;
  /** Element ranges [start, end) to re-upload after a rebuild. */
  readonly fill: readonly [number, number];
  readonly index: readonly [number, number];
  readonly lines: readonly [number, number];
}

/** Writes a freshly generated building into its slot. Throws if a slot capacity is exceeded. */
function writeLot(city: City, lot: Lot, rng: Rng): LotUpload {
  const { b, y0, y1 } = lotGeometry(lot, rng);
  const vertexCount = b.fill.length / FILL_STRIDE;
  const lineCount = b.lines.length / LINE_STRIDE;
  if (vertexCount > LOT_VERTICES || b.index.length > LOT_INDICES || lineCount > LOT_LINE_VERTICES) {
    throw new Error(
      `paper-city: lot slot overflow (${vertexCount}/${b.index.length}/${lineCount})`,
    );
  }
  const v0 = city.base.fill + lot.slot * LOT_VERTICES;
  const i0 = city.base.index + lot.slot * LOT_INDICES;
  const l0 = city.base.lines + lot.slot * LOT_LINE_VERTICES;

  const fill = [v0 * FILL_STRIDE, (v0 + LOT_VERTICES) * FILL_STRIDE] as const;
  city.fill.fill(0, ...fill);
  city.fill.set(b.fill, fill[0]);
  for (let k = vertexCount; k < LOT_VERTICES; k++)
    city.fill[(v0 + k) * FILL_STRIDE + 6] = KIND.hidden;

  // Unused indices collapse onto the slot's first vertex: zero-area triangles draw nothing.
  const index = [i0, i0 + LOT_INDICES] as const;
  city.index.fill(v0, ...index);
  b.index.forEach((n, k) => (city.index[i0 + k] = v0 + n));

  const lines = [l0 * LINE_STRIDE, (l0 + LOT_LINE_VERTICES) * LINE_STRIDE] as const;
  city.lines.fill(0, ...lines);
  city.lines.set(b.lines, lines[0]);
  for (let k = lineCount; k < LOT_LINE_VERTICES; k++)
    city.lines[(l0 + k) * LINE_STRIDE + 4] = KIND.hidden;

  city.state[lot.obj * 4 + 2] = y0;
  city.state[lot.obj * 4 + 3] = y1;
  return { obj: lot.obj, fill, index, lines };
}

function car(b: Builder, x: number, z: number, alongX: boolean): void {
  // Two boxes (body, cabin); cars on cross streets are the same car turned 90 degrees.
  const parts: [number, number, number, number, number, number, number][] = [
    [MAT.paper, 0, 0.12, 0, 0.52, 0.3, 1.0],
    [MAT.roof, 0, 0.42, -0.05, 0.46, 0.24, 0.55],
  ];
  for (const [mat, px, py, pz, w, h, d] of parts) {
    if (alongX) b.box(mat, x - pz, py, z + px, d, h, w);
    else b.box(mat, x + px, py, z + pz, w, h, d);
  }
}

export function createCity(seed = CITY_SEED): City {
  const rng = createRng(seed);
  const s = new Builder();
  const state: number[] = [0, 0, 0, 0];
  const object = (texel: [number, number, number, number]): number => {
    state.push(...texel);
    return state.length / 4 - 1;
  };
  const lots: Lot[] = [];

  // Ground: a long strip tessellated along z so the shader can bend it over the horizon.
  s.inked = false;
  for (let k = 0; k < 120; k++) {
    const za = -300 + (380 * k) / 120;
    const zb = -300 + (380 * (k + 1)) / 120;
    s.quad(MAT.ground, [-300, 0, zb], [300, 0, zb], [300, 0, za], [-300, 0, za]);
  }

  const halfFov = Math.tan((CAMERA.fov * Math.PI) / 360);
  const xLimit = (z: number): number => (CAMERA.distance - z) * halfFov * 2.7 + 14;
  for (let j = -2; j < ROWS; j++) {
    const cz = -j * PITCH;
    const far = j >= 5;
    if (j < 4) {
      // Crosswalk and lane dashes, flat paper strips just above the road.
      s.kind = KIND.still;
      s.obj = 0;
      s.inked = false;
      const sz = cz + BLOCK / 2 + ROAD / 2;
      for (let k = -2; k <= 2; k++) s.box(MAT.paper, k * 1.15, 0.005, sz, 0.55, 0.02, 1.8);
      for (let k = 0; k < 3; k++) s.box(MAT.paper, 0, 0.005, cz + 3.5 - k * 4.2, 0.18, 0.02, 1.6);
    }
    for (let i = 0; i < COLS; i++) {
      for (const side of [-1, 1]) {
        const cx = side * (AVENUE / 2 + i * PITCH + BLOCK / 2);
        if (Math.abs(cx) - BLOCK / 2 > xLimit(cz)) continue;
        // Front-to-back wave: rows further away, and blocks further out, start later.
        const delay = INTRO_START + (j + 2) * 0.16 + i * 0.07 + rng() * 0.2;
        s.kind = KIND.slab;
        s.obj = object([delay - 0.15, 0, 0, 0]);
        s.inked = true;
        const park = rng() < 0.08 && !(j === 0 && i === 0);
        const near = j <= 3;
        s.slab(MAT.paper, cx, 0, cz, BLOCK, BLOCK, SLAB_H, 1.1);
        if (park) {
          s.slab(MAT.park, cx, SLAB_H, cz, BLOCK - 1.6, BLOCK - 1.6, 0.05, 0.8);
          for (let n = 0; n < (near ? 14 : 5); n++) {
            s.tree(
              rng,
              cx + between(rng, -4, 4),
              0.27,
              cz + between(rng, -4, 4),
              between(rng, 0.8, 1.25),
            );
          }
        } else if (near) {
          for (let x = -BLOCK / 2 + 1; x <= BLOCK / 2 - 1; x += 2.2) {
            if (rng() < 0.55)
              s.tree(rng, cx + x, SLAB_H, cz + BLOCK / 2 - 0.6, between(rng, 0.85, 1.1));
          }
          if (i === 0) {
            for (let z = -BLOCK / 2 + 1; z <= BLOCK / 2 - 1.5; z += 2.2) {
              if (rng() < 0.5) {
                s.tree(rng, cx - side * (BLOCK / 2 - 0.6), SLAB_H, cz + z, between(rng, 0.85, 1.1));
              }
            }
          }
        }
        s.ink(rng);
        if (park) continue;

        const margin = 1.25;
        const inner = BLOCK - 2 * margin;
        const r = rng();
        const [nx, nz] = far
          ? r < 0.5
            ? [1, 1]
            : [2, 1]
          : r < 0.6
            ? [2, 2]
            : r < 0.85
              ? [2, 1]
              : [1, 1];
        for (let a = 0; a < nx; a++) {
          for (let c = 0; c < nz; c++) {
            const cellW = inner / nx;
            const cellD = inner / nz;
            const big = nx === 1 && nz === 1 && !far;
            const w = big ? inner - between(rng, 0, 1.6) : cellW - between(rng, 0.8, 1.3);
            const d = big ? inner - between(rng, 0, 1.6) : cellD - between(rng, 0.8, 1.3);
            const ts = delay + between(rng, 0, 0.12);
            lots.push({
              obj: object([ts, -1, 0, 0]),
              slot: lots.length,
              x: cx - inner / 2 + cellW * (a + 0.5),
              z: cz - inner / 2 + cellD * (c + 0.5),
              w,
              d,
              big,
              j,
              i,
            });
          }
        }
      }
    }
  }

  s.kind = KIND.car;
  s.inked = true;
  for (let k = 0; k < 7; k++) {
    const dir = k % 2 ? 1 : -1;
    s.obj = object([1, between(rng, -110, 40), dir * between(rng, 3, 4.5), 0]);
    car(s, dir * -1.6, 0, false);
    s.ink(rng);
  }
  for (let k = 0; k < 6; k++) {
    const j = (k % 5) - 2;
    const dir = k % 2 ? 1 : -1;
    s.obj = object([2, between(rng, -90, 90), dir * between(rng, 2.5, 4), 0]);
    car(s, 0, -j * PITCH + BLOCK / 2 + ROAD / 2 + dir * 0.8, true);
    s.ink(rng);
  }

  const base = {
    fill: s.fill.length / FILL_STRIDE,
    index: s.index.length,
    lines: s.lines.length / LINE_STRIDE,
  };
  const rows = Math.ceil(state.length / 4 / STATE_WIDTH);
  const city: City = {
    fill: new Float32Array((base.fill + lots.length * LOT_VERTICES) * FILL_STRIDE),
    index: new Uint32Array(base.index + lots.length * LOT_INDICES),
    lines: new Float32Array((base.lines + lots.length * LOT_LINE_VERTICES) * LINE_STRIDE),
    state: new Float32Array(rows * STATE_WIDTH * 4),
    lots,
    base,
  };
  city.fill.set(s.fill);
  city.index.set(s.index);
  city.lines.set(s.lines);
  city.state.set(state);
  for (const lot of lots) writeLot(city, lot, rng);
  return city;
}

/** Schedules the idle rebuilds: every few seconds one building strips to its wireframe and rises anew. */
export class Rebuilder {
  private readonly city: City;
  private readonly rng: Rng;
  private next = INTRO_END;
  private pending: { lot: Lot; at: number } | undefined;

  constructor(city: City, seed = CITY_SEED + 1) {
    this.city = city;
    this.rng = createRng(seed);
  }

  /** Advances to time `t`; returns the objects (and slots) whose state changed. */
  step(t: number): LotUpload | { obj: number } | undefined {
    const { city, rng } = this;
    if (this.pending && t >= this.pending.at) {
      const { lot } = this.pending;
      this.pending = undefined;
      const upload = writeLot(city, lot, rng);
      city.state[lot.obj * 4] = t + 0.1;
      city.state[lot.obj * 4 + 1] = -1;
      return upload;
    }
    if (this.pending || t < this.next) return undefined;
    this.next = t + between(rng, 2.2, 3.8);
    const pool = city.lots.filter(
      (lot) => lot.j >= -1 && lot.j <= 5 && t - (city.state[lot.obj * 4] ?? 0) >= BUILD_TIME,
    );
    const lot = pool[Math.floor(rng() * pool.length)];
    if (!lot) return undefined;
    city.state[lot.obj * 4 + 1] = t;
    this.pending = { lot, at: t + STRIP_TIME };
    return { obj: lot.obj };
  }
}
