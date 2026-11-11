// <paper-city>: the hero's sketched 3D city (WebGL2, no library). The geometry is generated once
// from a fixed seed; per frame the CPU only sets the time and the camera, so the city costs two
// draw calls. Loaded lazily by paper-city-loader.ts; if WebGL2 is missing, the hero simply stays
// on the paper grid.
import { viewProjection } from '../lib/paper-city/camera.ts';
import {
  createCity,
  FILL_STRIDE,
  INTRO_END,
  LINE_STRIDE,
  Rebuilder,
  STATE_WIDTH,
  type City,
  type LotUpload,
} from '../lib/paper-city/city.ts';
import { fillFragment, fillVertex, lineFragment, lineVertex } from '../lib/paper-city/shaders.ts';

const MAX_PIXEL_RATIO = 1.5;
/** After the intro the city only sways and drives, so 30 fps is plenty and halves the GPU work. */
const IDLE_FRAME_MS = 1000 / 30;

interface Program {
  readonly program: WebGLProgram;
  readonly viewProj: WebGLUniformLocation | null;
  readonly time: WebGLUniformLocation | null;
  readonly state: WebGLUniformLocation | null;
}

function compile(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
): Program | undefined {
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const;
  for (const [type, source] of shaders) {
    const shader = gl.createShader(type);
    if (!shader) return undefined;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
  return {
    program,
    viewProj: gl.getUniformLocation(program, 'uViewProj'),
    time: gl.getUniformLocation(program, 'uTime'),
    state: gl.getUniformLocation(program, 'uState'),
  };
}

/** Binds float attributes laid out back to back; `sizes` lists the component count per location. */
function layout(gl: WebGL2RenderingContext, sizes: readonly number[], stride: number): void {
  let offset = 0;
  sizes.forEach((size, location) => {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride * 4, offset * 4);
    offset += size;
  });
}

class PaperCity extends HTMLElement {
  private gl: WebGL2RenderingContext | undefined;
  private city: City | undefined;
  private rebuilder: Rebuilder | undefined;
  private fill: Program | undefined;
  private lines: Program | undefined;
  private fillVao: WebGLVertexArrayObject | null = null;
  private lineVao: WebGLVertexArrayObject | null = null;
  private fillBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private lineBuffer: WebGLBuffer | null = null;
  private stateTexture: WebGLTexture | null = null;
  private readonly matrix = new Float32Array(16);
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly canvas = document.createElement('canvas');
  private resizeObserver: ResizeObserver | undefined;
  private intersectionObserver: IntersectionObserver | undefined;
  private frame = 0;
  private lastDraw = 0;
  private startedAt = 0;
  private inView = true;

  connectedCallback(): void {
    if (this.gl) return;
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
    if (!gl || !this.setup(gl)) return;
    this.append(this.canvas);
    this.startedAt = performance.now();
    this.canvas.addEventListener('webglcontextlost', this.stop);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(this);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.inView = entry?.isIntersecting ?? true;
      this.schedule();
    });
    this.intersectionObserver.observe(this);
    document.addEventListener('visibilitychange', this.schedule);
    this.reducedMotion.addEventListener('change', this.resize);
  }

  disconnectedCallback(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.schedule);
    this.reducedMotion.removeEventListener('change', this.resize);
    this.canvas.removeEventListener('webglcontextlost', this.stop);
  }

  private setup(gl: WebGL2RenderingContext): boolean {
    const fill = compile(gl, fillVertex, fillFragment);
    const lines = compile(gl, lineVertex, lineFragment);
    if (!fill || !lines) return false;
    const city = createCity();
    this.gl = gl;
    this.city = city;
    this.rebuilder = new Rebuilder(city);
    this.fill = fill;
    this.lines = lines;

    this.fillVao = gl.createVertexArray();
    gl.bindVertexArray(this.fillVao);
    this.fillBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, city.fill, gl.DYNAMIC_DRAW);
    layout(gl, [3, 2, 1, 1, 1], FILL_STRIDE);
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, city.index, gl.DYNAMIC_DRAW);

    this.lineVao = gl.createVertexArray();
    gl.bindVertexArray(this.lineVao);
    this.lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, city.lines, gl.DYNAMIC_DRAW);
    layout(gl, [3, 1, 1, 1], LINE_STRIDE);
    gl.bindVertexArray(null);

    this.stateTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.stateTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const rows = city.state.length / 4 / STATE_WIDTH;
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      STATE_WIDTH,
      rows,
      0,
      gl.RGBA,
      gl.FLOAT,
      city.state,
    );

    // No polygon offset: with perspective depth it pushes distant walls behind lines they should hide.
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    return true;
  }

  private readonly resize = (): void => {
    const ratio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
    this.canvas.width = Math.max(1, Math.round(this.clientWidth * ratio));
    this.canvas.height = Math.max(1, Math.round(this.clientHeight * ratio));
    this.lastDraw = 0;
    this.draw(performance.now());
    this.schedule();
  };

  private readonly stop = (): void => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  };

  private readonly schedule = (): void => {
    if (this.frame || !this.animating()) return;
    this.frame = requestAnimationFrame(this.tick);
  };

  private animating(): boolean {
    return (
      this.inView && !document.hidden && !this.reducedMotion.matches && !this.gl?.isContextLost()
    );
  }

  private readonly tick = (now: number): void => {
    this.frame = 0;
    if (!this.animating()) return;
    const idle = this.seconds(now) > INTRO_END;
    if (!idle || now - this.lastDraw >= IDLE_FRAME_MS) this.draw(now);
    this.schedule();
  };

  /** Scene time; reduced motion shows the finished, still city. */
  private seconds(now: number): number {
    return this.reducedMotion.matches ? 99 : (now - this.startedAt) / 1000;
  }

  private upload(change: LotUpload | { obj: number }): void {
    const { gl, city } = this;
    if (!gl || !city) return;
    const { obj } = change;
    gl.bindTexture(gl.TEXTURE_2D, this.stateTexture);
    const texel = city.state.subarray(obj * 4, obj * 4 + 4);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      obj % STATE_WIDTH,
      Math.floor(obj / STATE_WIDTH),
      1,
      1,
      gl.RGBA,
      gl.FLOAT,
      texel,
    );
    if (!('fill' in change)) return;
    const ranges = [
      [gl.ARRAY_BUFFER, this.fillBuffer, city.fill, change.fill],
      [gl.ARRAY_BUFFER, this.lineBuffer, city.lines, change.lines],
      [gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer, city.index, change.index],
    ] as const;
    gl.bindVertexArray(null);
    for (const [target, buffer, data, [start, end]] of ranges) {
      gl.bindBuffer(target, buffer);
      gl.bufferSubData(target, start * data.BYTES_PER_ELEMENT, data, start, end - start);
    }
  }

  private draw(now: number): void {
    const { gl, city, fill, lines } = this;
    if (!gl || !city || !fill || !lines || gl.isContextLost()) return;
    const t = this.seconds(now);
    if (!this.reducedMotion.matches) {
      const change = this.rebuilder?.step(t);
      if (change) this.upload(change);
    }
    this.lastDraw = now;
    const { width, height } = this.canvas;
    gl.viewport(0, 0, width, height);
    // The line pass leaves depth writes off, and clear() honours the depth mask.
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    viewProjection(this.matrix, width / height, t);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.stateTexture);

    const use = (p: Program): void => {
      gl.useProgram(p.program);
      gl.uniformMatrix4fv(p.viewProj, false, this.matrix);
      gl.uniform1f(p.time, t);
      gl.uniform1i(p.state, 0);
    };

    use(fill);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.fillVao);
    gl.drawElements(gl.TRIANGLES, city.index.length, gl.UNSIGNED_INT, 0);

    use(lines);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.bindVertexArray(this.lineVao);
    gl.drawArrays(gl.LINES, 0, city.lines.length / LINE_STRIDE);
    gl.bindVertexArray(null);

    this.dataset.ready = '';
  }
}

if (!customElements.get('paper-city')) customElements.define('paper-city', PaperCity);
