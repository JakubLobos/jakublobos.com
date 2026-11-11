// GLSL ES 3.00 programs for the paper city. Kind and style numbers mirror KIND/STYLE in
// geometry.ts; attribute locations mirror the vertex layouts there; colours arrive as uniforms
// read from the design tokens (palette.ts).
import { RADIUS } from './camera.ts';
import { STATE_WIDTH } from './city.ts';
import { KIND, STYLE } from './geometry.ts';
import { CITY_MATERIAL_TOKENS } from './palette.ts';

const vertexCommon = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
uniform mat4 uViewProj;
uniform float uTime;
uniform sampler2D uState;
const float R = ${RADIUS.toFixed(1)};
const vec4 OFF = vec4(2.0, 2.0, 2.0, 1.0);

vec4 stateOf(float obj) {
  int n = int(obj + 0.5);
  return texelFetch(uState, ivec2(n % ${STATE_WIDTH}, n / ${STATE_WIDTH}), 0);
}
float sat(float x) { return clamp(x, 0.0, 1.0); }
float ioe(float x) { float k = -2.0 * x + 2.0; return x < 0.5 ? 4.0 * x * x * x : 1.0 - k * k * k / 2.0; }
float cubeOut(float x) { float k = 1.0 - x; return 1.0 - k * k * k; }
float backOut(float x) { float k = x - 1.0; return 1.0 + 2.25 * k * k * k + 1.25 * k * k; }

// Building progress at uTime: x = paper fill fraction, y = wireframe height scale, z = wireframe alpha.
vec3 progress(vec4 s) {
  if (s.y >= 0.0) {
    float k = uTime - s.y;
    return vec3(1.0 - ioe(sat((k - 0.2) / 0.75)), 1.0, 0.55 * sat(k / 0.2));
  }
  float u = uTime - s.x;
  if (u <= 0.0) return vec3(0.0);
  return vec3(ioe(sat((u - 0.5) / 1.0)), cubeOut(sat(u / 0.6)), 0.55 * sat(u / 0.15) * (1.0 - sat((u - 1.5) / 0.45)));
}
float clipY(vec4 s, float f) { return s.z + (s.w - s.z) * f + 0.001; }

// Animates one vertex by its kind. Returns false when it is not drawn this frame; level is the
// height above which a building is still unbuilt (1e9 = fully built).
bool animate(int kind, vec4 s, inout vec3 p, out float level) {
  level = 1e9;
  if (kind == ${KIND.hidden}) return false;
  if (kind == ${KIND.slab}) {
    float k = sat((uTime - s.x) / 0.7);
    if (k <= 0.0) return false;
    p.y *= k >= 1.0 ? 1.0 : max(1e-4, backOut(k));
  } else if (kind == ${KIND.body}) {
    float f = progress(s).x;
    if (f <= 0.0) return false;
    if (f < 1.0) level = clipY(s, f);
  } else if (kind == ${KIND.cap}) {
    float f = progress(s).x;
    if (f <= 0.0 || f >= 1.0) return false;
    p.y = clipY(s, f);
  } else if (kind == ${KIND.wire}) {
    vec3 g = progress(s);
    if (g.z <= 0.0) return false;
    p.y = s.z + (p.y - s.z) * max(1e-4, g.y);
  } else if (kind == ${KIND.car}) {
    float lo = s.x < 1.5 ? -120.0 : -110.0;
    float hi = s.x < 1.5 ? 45.0 : 110.0;
    float c = lo + mod(s.y + s.z * uTime - lo, hi - lo);
    if (s.x < 1.5) p.z += c; else p.x += c;
  }
  return true;
}

// Bends flat coordinates onto the ground cylinder (axis along x, top at y = 0).
vec4 project(vec3 p) {
  float a = p.z / R;
  float r = R + p.y;
  return uViewProj * vec4(p.x, r * cos(a) - R, r * sin(a), 1.0);
}
`;

export const fillVertex = /* glsl */ `${vertexCommon}
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec2 aUv;
layout(location = 2) in float aMat;
layout(location = 3) in float aKind;
layout(location = 4) in float aObj;
out vec2 vUv;
out float vY;
flat out float vLevel;
flat out int vMat;

void main() {
  vec3 p = aPos;
  vUv = aUv;
  vMat = int(aMat + 0.5);
  vY = p.y;
  float level;
  gl_Position = animate(int(floor(aKind + 0.5)), stateOf(aObj), p, level) ? project(p) : OFF;
  vLevel = level;
}
`;

export const fillFragment = /* glsl */ `#version 300 es
precision highp float;
uniform vec3 uPalette[${CITY_MATERIAL_TOKENS.length}];
uniform vec3 uGraphite;
in vec2 vUv;
in float vY;
flat in float vLevel;
flat in int vMat;
out vec4 outColor;

float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
float stroke(float d, float halfWidth, float aa) { return clamp((halfWidth - d) / aa + 0.5, 0.0, 1.0); }

// One window per uv cell, drawn as wobbly graphite strokes in a 64-unit tile (y down).
float windowInk(vec2 uv, int kind) {
  vec2 q = vec2(fract(uv.x), 1.0 - fract(uv.y)) * 64.0;
  float aa = max(length(fwidth(uv)) * 64.0, 1e-3);
  float a;
  float b = 1e3;
  if (kind == 1) {
    a = min(min(seg(q, vec2(15.0, 16.0), vec2(50.0, 14.0)), seg(q, vec2(47.0, 13.0), vec2(48.0, 49.0))),
            min(seg(q, vec2(49.0, 47.0), vec2(15.0, 48.0)), seg(q, vec2(17.0, 49.0), vec2(16.0, 13.0))));
    b = min(seg(q, vec2(23.0, 28.0), vec2(30.0, 21.0)), seg(q, vec2(23.0, 35.0), vec2(37.0, 21.0)));
  } else if (kind == 2) {
    a = min(seg(q, vec2(24.0, -2.0), vec2(25.0, 66.0)), seg(q, vec2(41.0, -2.0), vec2(40.0, 66.0)));
  } else {
    a = min(seg(q, vec2(-2.0, 20.0), vec2(66.0, 21.0)), seg(q, vec2(-2.0, 44.0), vec2(66.0, 43.0)));
  }
  // Tiny, distant cells would shimmer; fade their strokes into an even grey wash instead.
  float detail = clamp(3.0 / aa, 0.0, 1.0);
  float ink = max(0.38 * stroke(a, 1.0, aa), 0.24 * stroke(b, 0.7, aa));
  return ink * detail + 0.025 * (1.0 - detail);
}

void main() {
  if (vY > vLevel) discard;
  vec3 c = uPalette[vMat];
  if (vMat >= 1 && vMat <= 3) c = mix(c, uGraphite, windowInk(vUv, vMat));
  outColor = vec4(c, 1.0);
}
`;

export const lineVertex = /* glsl */ `${vertexCommon}
layout(location = 0) in vec3 aPos;
layout(location = 1) in float aStyle;
layout(location = 2) in float aKind;
layout(location = 3) in float aObj;
out float vY;
out float vAlpha;
flat out float vLevel;
flat out int vStyle;

void main() {
  vec3 p = aPos;
  int kind = int(floor(aKind + 0.5));
  vec4 s = stateOf(aObj);
  vStyle = int(aStyle + 0.5);
  vY = p.y;
  vAlpha = kind == ${KIND.wire} ? progress(s).z : kind == ${KIND.cap} ? 0.6 : 0.42;
  float level;
  gl_Position = animate(kind, s, p, level) ? project(p) : OFF;
  vLevel = level;
}
`;

export const lineFragment = /* glsl */ `#version 300 es
precision highp float;
uniform vec3 uInk;
uniform vec3 uWire;
in float vY;
in float vAlpha;
flat in float vLevel;
flat in int vStyle;
out vec4 outColor;

void main() {
  if (vY > vLevel) discard;
  vec3 c = vStyle == ${STYLE.ink} ? uInk : uWire;
  outColor = vec4(c * vAlpha, vAlpha);
}
`;
