// Camera for the paper city. The ground is a cylinder of RADIUS, so the city drops away over a
// real horizon instead of ending in fog; the camera looks along that horizon and the projection
// is shifted so the horizon sits at HORIZON of the canvas height, leaving the sky for the text.

export const RADIUS = 210;

export const CAMERA = {
  height: 22,
  distance: 50,
  fov: 34,
  /** Portrait canvases widen the view so the street still reads as a city, not a corridor. */
  portraitFov: 44,
  near: 1,
  far: 400,
  /** Horizon height as a fraction of the canvas height, from the top. */
  horizon: 0.67,
  swayX: 2.4,
  swayPeriod: 44,
} as const;

const DIP =
  Math.acos(RADIUS / Math.hypot(RADIUS + CAMERA.height, CAMERA.distance)) -
  Math.atan2(CAMERA.distance, RADIUS + CAMERA.height);

type Vec3 = [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Writes the column-major view-projection matrix for time `t` (seconds) into `out`. */
export function viewProjection(out: Float32Array, aspect: number, t: number): Float32Array {
  const dx = CAMERA.swayX * Math.sin((t * Math.PI * 2) / CAMERA.swayPeriod);
  const eye: Vec3 = [dx, CAMERA.height, CAMERA.distance];
  const target: Vec3 = [dx * 0.6, CAMERA.height - Math.tan(DIP) * 100, CAMERA.distance - 100];
  const z = normalize(sub(eye, target));
  const x = normalize(cross([0, 1, 0], z));
  const y = cross(z, x);

  const fov = ((aspect < 1 ? CAMERA.portraitFov : CAMERA.fov) * Math.PI) / 180;
  const f = 1 / Math.tan(fov / 2);
  const { near, far } = CAMERA;
  const p0 = f / aspect;
  const p5 = f;
  const p9 = -(1 - 2 * CAMERA.horizon);
  const p10 = (far + near) / (near - far);
  const p14 = (2 * far * near) / (near - far);

  // view = [x y z | -eye·axes]; projection = perspective with the vertical shift in p9.
  const tx = -dot(x, eye);
  const ty = -dot(y, eye);
  const tz = -dot(z, eye);
  const cols: [number, number, number, number][] = [
    [x[0], y[0], z[0], 0],
    [x[1], y[1], z[1], 0],
    [x[2], y[2], z[2], 0],
    [tx, ty, tz, 1],
  ];
  cols.forEach(([vx, vy, vz, vw], c) => {
    out[c * 4] = p0 * vx;
    out[c * 4 + 1] = p5 * vy + p9 * vz;
    out[c * 4 + 2] = p10 * vz + p14 * vw;
    out[c * 4 + 3] = -vz;
  });
  return out;
}
