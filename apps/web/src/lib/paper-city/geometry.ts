// Geometry primitives for the paper city: boxes, slabs, trees and hand-drawn ink outlines, written
// straight into the interleaved vertex layouts the shaders read.
import { between, type Rng } from './rng.ts';

/** Materials; colours come from the --city-* tokens (see CITY_COLOR_TOKENS in palette.ts). */
export const MAT = { paper: 0, roof: 4, park: 5, trunk: 7, accent: 8, ground: 13 } as const;
export const ACCENT_COUNT = 5;
const WINDOW_W = 1.05;
const FLOOR_H = 0.85;

/** What the vertex shader does with a vertex; mirrored in shaders.ts. */
export const KIND = { hidden: -1, still: 0, slab: 1, body: 2, cap: 3, wire: 4, car: 5 } as const;
export const STYLE = { ink: 0, wire: 1, cap: 2 } as const;

/** Fill vertex: x y z u v material kind object. Line vertex: x y z style kind object. */
export const FILL_STRIDE = 8;
export const LINE_STRIDE = 6;
export type V3 = readonly [number, number, number];
type Kind = (typeof KIND)[keyof typeof KIND];
export type Style = (typeof STYLE)[keyof typeof STYLE];

export class Builder {
  readonly fill: number[] = [];
  readonly index: number[] = [];
  readonly lines: number[] = [];
  private readonly edges: number[] = [];
  kind: Kind = KIND.still;
  obj = 0;
  inked = true;

  private vertex(p: V3, u: number, v: number, mat: number): number {
    this.fill.push(p[0], p[1], p[2], u, v, mat, this.kind, this.obj);
    return this.fill.length / FILL_STRIDE - 1;
  }

  private edge(a: V3, b: V3): void {
    if (this.inked) this.edges.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }

  line(a: V3, b: V3, style: Style): void {
    this.lines.push(a[0], a[1], a[2], style, this.kind, this.obj);
    this.lines.push(b[0], b[1], b[2], style, this.kind, this.obj);
  }

  quad(mat: number, a: V3, b: V3, c: V3, d: V3, uw = 1, vh = 1): void {
    const i = this.vertex(a, 0, 0, mat);
    this.vertex(b, uw, 0, mat);
    this.vertex(c, uw, vh, mat);
    this.vertex(d, 0, vh, mat);
    this.index.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }

  tri(mat: number, a: V3, b: V3, c: V3): void {
    const i = this.vertex(a, 0, 0, mat);
    this.vertex(b, 1, 0, mat);
    this.vertex(c, 0.5, 1, mat);
    this.index.push(i, i + 1, i + 2);
    this.edge(a, b);
    this.edge(b, c);
    this.edge(c, a);
  }

  private fan(mat: number, center: V3, rim: V3[]): void {
    const c = this.vertex(center, 0.5, 0.5, mat);
    rim.forEach((p) => this.vertex(p, 0, 0, mat));
    rim.forEach((p, k) => {
      const next = (k + 1) % rim.length;
      this.index.push(c, c + 1 + k, c + 1 + next);
      this.edge(p, rim[next] ?? p);
    });
  }

  /** A box standing on y with its centre at x/z. Window materials tile one cell per window. */
  box(mat: number, x: number, y: number, z: number, w: number, h: number, d: number): void {
    const x0 = x - w / 2;
    const x1 = x + w / 2;
    const z0 = z - d / 2;
    const z1 = z + d / 2;
    const y1 = y + h;
    const windows = mat >= 1 && mat <= 3;
    const cu = (s: number): number => (windows ? Math.max(1, Math.round(s / WINDOW_W)) : 1);
    const cv = windows ? Math.max(1, Math.round(h / FLOOR_H)) : 1;
    this.quad(mat, [x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1], cu(w), cv);
    this.quad(mat, [x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0], cu(w), cv);
    this.quad(mat, [x1, y, z1], [x1, y, z0], [x1, y1, z0], [x1, y1, z1], cu(d), cv);
    this.quad(mat, [x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0], cu(d), cv);
    this.quad(windows ? MAT.paper : mat, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
    const corners: [number, number][] = [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ];
    corners.forEach(([ax, az], k) => {
      const [bx, bz] = corners[(k + 1) % 4] ?? [ax, az];
      this.edge([ax, y, az], [bx, y, bz]);
      this.edge([ax, y1, az], [bx, y1, bz]);
      this.edge([ax, y, az], [ax, y1, az]);
    });
  }

  pyramid(mat: number, x: number, y: number, z: number, s: number, h: number): void {
    const a: V3 = [x - s, y, z + s];
    const b: V3 = [x + s, y, z + s];
    const c: V3 = [x + s, y, z - s];
    const d: V3 = [x - s, y, z - s];
    const top: V3 = [x, y + h, z];
    // Slanted faces share their edges, so only the base and the four ridges are inked.
    const inked = this.inked;
    this.inked = false;
    this.tri(mat, a, b, top);
    this.tri(mat, c, d, top);
    this.tri(mat, b, c, top);
    this.tri(mat, d, a, top);
    this.inked = inked;
    for (const [p, q] of [
      [a, b],
      [b, c],
      [c, d],
      [d, a],
    ] as const) {
      this.edge(p, q);
      this.edge(p, top);
    }
  }

  private disk(mat: number, x: number, y: number, z: number, r: number, axis: 'x' | 'z'): void {
    const rim: V3[] = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const u = Math.cos(a) * r;
      const v = Math.sin(a) * r;
      rim.push(axis === 'x' ? [x + u, y + v, z] : [x, y + v, z + u]);
    }
    this.fan(mat, [x, y, z], rim);
  }

  /** A rounded slab (city block or park lawn); x/z is its centre. */
  slab(
    mat: number,
    cx: number,
    y: number,
    cz: number,
    w: number,
    d: number,
    h: number,
    r: number,
  ): void {
    const pts: [number, number][] = [];
    for (let q = 0; q < 4; q++) {
      const mid = ((q + 0.5) * Math.PI) / 2;
      const sx = Math.sign(Math.cos(mid));
      const sz = Math.sign(Math.sin(mid));
      for (let k = 0; k <= 4; k++) {
        const a = ((q + k / 4) * Math.PI) / 2;
        pts.push([
          cx + sx * (w / 2 - r) + Math.cos(a) * r,
          cz - (sz * (d / 2 - r) + Math.sin(a) * r),
        ]);
      }
    }
    const y1 = y + h;
    const inked = this.inked;
    this.inked = false;
    pts.forEach(([px, pz], k) => {
      const [qx, qz] = pts[(k + 1) % pts.length] ?? [px, pz];
      this.quad(mat, [px, y, pz], [qx, y, qz], [qx, y1, qz], [px, y1, pz]);
    });
    this.inked = inked;
    // The top fan inks the upper rim; the lower rim is added here.
    this.fan(
      mat,
      [cx, y1, cz],
      pts.map(([px, pz]): V3 => [px, y1, pz]),
    );
    pts.forEach(([px, pz], k) => {
      const [qx, qz] = pts[(k + 1) % pts.length] ?? [px, pz];
      this.edge([px, y, pz], [qx, y, qz]);
    });
  }

  tree(rng: Rng, x: number, y: number, z: number, s: number): void {
    const green = rng() < 0.5 ? MAT.park : MAT.park + 1;
    this.box(MAT.trunk, x, y, z, 0.12, s, 0.12);
    if (rng() < 0.6) {
      this.disk(green, x, y + 1.25 * s, z, 0.62 * s, 'x');
      this.disk(green, x, y + 1.25 * s, z, 0.62 * s, 'z');
    } else {
      const y0 = y + 0.45 * s;
      const w = 0.55 * s;
      const top = y0 + 1.8 * s;
      this.tri(green, [x - w, y0, z], [x + w, y0, z], [x, top, z]);
      this.tri(green, [x, y0, z - w], [x, y0, z + w], [x, top, z]);
    }
  }

  /**
   * Turns the recorded edges into hand-drawn ink: every edge is jittered and overshoots its
   * corners, and about 30% get a second, looser stroke (while `maxVertices` allows).
   */
  ink(rng: Rng, maxVertices = Infinity): void {
    const e = this.edges;
    const limit = this.lines.length / LINE_STRIDE + maxVertices;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < e.length; i += 6) {
        if (pass && rng() < 0.7) continue;
        if (this.lines.length / LINE_STRIDE + 2 > limit) break;
        const ax = e[i] ?? 0;
        const ay = e[i + 1] ?? 0;
        const az = e[i + 2] ?? 0;
        const dx = (e[i + 3] ?? 0) - ax;
        const dy = (e[i + 4] ?? 0) - ay;
        const dz = (e[i + 5] ?? 0) - az;
        const len = Math.hypot(dx, dy, dz);
        if (len < 0.04) continue;
        const [ux, uy, uz] = [dx / len, dy / len, dz / len];
        const j = pass ? 0.04 : 0.012;
        const reach = (): number =>
          Math.min(len * 0.12, pass ? between(rng, 0.03, 0.12) : between(rng, 0, 0.06));
        const o1 = reach();
        const o2 = reach();
        const n = (): number => between(rng, -j, j);
        this.line(
          [ax - ux * o1 + n(), ay - uy * o1 + n(), az - uz * o1 + n()],
          [ax + dx + ux * o2 + n(), ay + dy + uy * o2 + n(), az + dz + uz * o2 + n()],
          STYLE.ink,
        );
      }
    }
    e.length = 0;
  }
}
