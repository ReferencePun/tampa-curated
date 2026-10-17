import { motion } from "./settings";
import {
  printGeometry,
  projectPoint,
  type PrintGeometry,
  type SleeveGeometry,
} from "./sleeve-model";
export interface Optics {
  draw: (
    prints: PrintGeometry[],
    stage: SleeveGeometry,
    velocity: number,
  ) => void;
  resize: (stage: SleeveGeometry) => void;
  syncTextures: (images: HTMLImageElement[], selected: number) => Promise<void>;
  dispose: () => void;
}
interface Options {
  valid: () => boolean;
  onFallback: (reason: string) => void;
  signal: AbortSignal;
}

// Original, bounded WebGL 1 shader. One pass, no framework, no render targets.
const vertex = `
attribute vec3 a_position;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  gl_Position = vec4(a_position.xy * a_position.z, 0.0, a_position.z);
  v_uv = a_uv;
}`;
const fragment = `
precision mediump float;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_stage;
uniform vec4 u_window;
uniform vec2 u_crop;
uniform vec4 u_border;
uniform vec3 u_tint;
uniform float u_strength;
uniform float u_velocity;
varying vec2 v_uv;
void main() {
  vec2 point = vec2(gl_FragCoord.x / u_resolution.x, 1.0 - gl_FragCoord.y / u_resolution.y);
  if(point.x < u_window.x || point.x > u_window.y || point.y < u_window.z || point.y > u_window.w) discard;
  // Transparent writes clear the rear print's optical pixels beneath this
  // print's paper border. The aligned DOM border and annotation show through.
  if(v_uv.x < u_border.x || v_uv.x > u_border.y || v_uv.y < u_border.z || v_uv.y > u_border.w) { gl_FragColor = vec4(0.0); return; }
  float leftEdge = (point.x - u_window.x) * u_stage.x;
  float rightEdge = (u_window.y - point.x) * u_stage.x;
  float edge = exp(-min(leftEdge, rightEdge) / 10.0);
  float direction = leftEdge < rightEdge ? 1.0 : -1.0;
  vec2 imageUv = (v_uv - u_border.xz) / (u_border.yw - u_border.xz);
  vec2 uv = (imageUv - .5) * u_crop + .5;
  uv.x += direction * edge * u_strength / u_stage.x * (1.0 + min(abs(u_velocity) * 80.0, .6));
  vec3 sampleColor = texture2D(u_image, clamp(uv, .001, .999)).rgb;
  float gray = clamp((dot(sampleColor, vec3(.2126,.7152,.0722)) - .5) * 1.1 + .5, 0.0, 1.0);
  vec3 transmitted = gray * u_tint;
  transmitted += vec3(1.0,.86,.63) * (edge * .12 + .016);
  gl_FragColor = vec4(transmitted, 1.0);
}`;

export async function createOptics(
  stageElement: HTMLElement,
  images: HTMLImageElement[],
  selected: number,
  initial: SleeveGeometry,
  options: Options,
): Promise<Optics | undefined> {
  const canvas = document.createElement("canvas");
  canvas.className = "sleeve-optics";
  canvas.setAttribute("aria-hidden", "true");
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: true,
    });
  } catch {
    return;
  }
  if (!gl) return;
  const context = gl;
  const shaders: WebGLShader[] = [];
  const textures = new Map<number, { texture: WebGLTexture; ratio: number }>();
  const pending = new Map<number, Promise<void>>();
  let wanted = new Set<number>(),
    disposed = false,
    lastWidth = 0,
    lastHeight = 0;
  let renderCount = 0,
    slowDraws = 0,
    totalDrawTime = 0;
  let calibrationFrame = 0,
    resolveCalibration: ((time: number) => void) | undefined;
  const program = context.createProgram()!,
    buffer = context.createBuffer()!;
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(calibrationFrame);
    resolveCalibration?.(0);
    options.signal.removeEventListener("abort", dispose);
    canvas.removeEventListener("webglcontextlost", lost);
    textures.forEach(({ texture }) => context.deleteTexture(texture));
    textures.clear();
    context.deleteBuffer(buffer);
    context.deleteProgram(program);
    shaders.forEach((shader) => context.deleteShader(shader));
    canvas.remove();
    context.getExtension("WEBGL_lose_context")?.loseContext();
  }
  function lost(event: Event) {
    event.preventDefault();
    options.onFallback("context-lost");
    dispose();
  }
  canvas.addEventListener("webglcontextlost", lost);
  options.signal.addEventListener("abort", dispose, { once: true });
  try {
    for (const [type, source] of [
      [context.VERTEX_SHADER, vertex],
      [context.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = context.createShader(type)!;
      shaders.push(shader);
      context.shaderSource(shader, source);
      context.compileShader(shader);
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS))
        throw new Error("Shader compilation unavailable");
      context.attachShader(program, shader);
    }
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS))
      throw new Error("Shader linking unavailable");
  } catch {
    dispose();
    return;
  }
  context.useProgram(program);
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  const position = context.getAttribLocation(program, "a_position"),
    uv = context.getAttribLocation(program, "a_uv");
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 3, context.FLOAT, false, 20, 0);
  context.enableVertexAttribArray(uv);
  context.vertexAttribPointer(uv, 2, context.FLOAT, false, 20, 12);
  const uniforms = Object.fromEntries(
    [
      "resolution",
      "stage",
      "window",
      "crop",
      "border",
      "tint",
      "strength",
      "velocity",
      "image",
    ].map((key) => [key, context.getUniformLocation(program, `u_${key}`)]),
  );
  context.uniform1i(uniforms.image, 0);
  context.uniform3f(uniforms.tint, ...motion.tint);
  context.uniform1f(uniforms.strength, motion.opticsStrength);
  context.clearColor(0, 0, 0, 0);
  function resize(stage: SleeveGeometry) {
    if (disposed) return;
    const dpr = Math.min(devicePixelRatio || 1, motion.maxDpr);
    const width = Math.round(stage.width * dpr),
      height = Math.round(stage.height * dpr);
    if (width !== lastWidth || height !== lastHeight) {
      canvas.width = width;
      canvas.height = height;
      lastWidth = width;
      lastHeight = height;
      context.viewport(0, 0, width, height);
    }
  }
  async function syncTextures(
    sourceImages: HTMLImageElement[],
    center: number,
  ) {
    if (disposed) return;
    wanted = new Set(
      [center - 1, center, center + 1].filter(
        (i) => i >= 0 && i < sourceImages.length,
      ),
    );
    for (const [index, item] of textures)
      if (!wanted.has(index)) {
        context.deleteTexture(item.texture);
        textures.delete(index);
      }
    await Promise.all(
      [...wanted].map(async (index) => {
        if (textures.has(index)) return;
        if (pending.has(index)) return pending.get(index);
        const work = (async () => {
          const image = sourceImages[index];
          try {
            await image.decode();
          } catch {
            return;
          }
          if (disposed || !wanted.has(index) || !image.naturalWidth) return;
          const texture = context.createTexture()!;
          context.bindTexture(context.TEXTURE_2D, texture);
          context.texParameteri(
            context.TEXTURE_2D,
            context.TEXTURE_WRAP_S,
            context.CLAMP_TO_EDGE,
          );
          context.texParameteri(
            context.TEXTURE_2D,
            context.TEXTURE_WRAP_T,
            context.CLAMP_TO_EDGE,
          );
          context.texParameteri(
            context.TEXTURE_2D,
            context.TEXTURE_MIN_FILTER,
            context.LINEAR,
          );
          context.texParameteri(
            context.TEXTURE_2D,
            context.TEXTURE_MAG_FILTER,
            context.LINEAR,
          );
          try {
            context.texImage2D(
              context.TEXTURE_2D,
              0,
              context.RGBA,
              context.RGBA,
              context.UNSIGNED_BYTE,
              image,
            );
          } catch {
            context.deleteTexture(texture);
            return;
          }
          textures.set(index, {
            texture,
            ratio: image.naturalWidth / image.naturalHeight,
          });
          stageElement.dataset.textureCount = String(textures.size);
        })();
        pending.set(index, work);
        await work;
        pending.delete(index);
      }),
    );
  }
  function draw(
    prints: PrintGeometry[],
    stage: SleeveGeometry,
    velocity: number,
  ) {
    if (disposed || !options.valid()) return;
    const started = performance.now();
    resize(stage);
    context.clear(context.COLOR_BUFFER_BIT);
    context.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    context.uniform2f(uniforms.stage, stage.width, stage.height);
    context.uniform4f(
      uniforms.window,
      stage.left / stage.width,
      stage.right / stage.width,
      stage.top / stage.height,
      stage.bottom / stage.height,
    );
    context.uniform1f(uniforms.velocity, velocity);
    // Match the DOM paint order. Border and archival annotation stay in HTML.
    const sorted = [...prints].sort(
      (a, b) =>
        Math.abs(b.distance) - Math.abs(a.distance) || a.index - b.index,
    );
    for (const print of sorted) {
      const item = textures.get(print.index);
      if (!item || Math.abs(print.distance) > 1.8) continue;
      const points = [
        [0, 0, 0, 0],
        [print.width, 0, 1, 0],
        [0, print.height, 0, 1],
        [0, print.height, 0, 1],
        [print.width, 0, 1, 0],
        [print.width, print.height, 1, 1],
      ];
      const vertices = points.flatMap(([x, y, u, v]) => {
        const p = projectPoint(print, x, y);
        return [
          (p.x / stage.width) * 2 - 1,
          1 - (p.y / stage.height) * 2,
          p.w,
          u,
          v,
        ];
      });
      const aspect = (print.width - 24) / (print.height - 40);
      context.uniform2f(
        uniforms.crop,
        Math.min(1, aspect / item.ratio),
        Math.min(1, item.ratio / aspect),
      );
      context.uniform4f(
        uniforms.border,
        12 / print.width,
        1 - 12 / print.width,
        12 / print.height,
        1 - 28 / print.height,
      );
      context.bindTexture(context.TEXTURE_2D, item.texture);
      context.bufferData(
        context.ARRAY_BUFFER,
        new Float32Array(vertices),
        context.DYNAMIC_DRAW,
      );
      context.drawArrays(context.TRIANGLES, 0, 6);
    }
    const elapsed = performance.now() - started;
    renderCount++;
    totalDrawTime += elapsed;
    if (elapsed > motion.maxDrawMs) slowDraws++;
    stageElement.dataset.opticsFrames = String(renderCount);
    stageElement.dataset.opticsMeanMs = (totalDrawTime / renderCount).toFixed(
      2,
    );
    if (renderCount > 30 && slowDraws / renderCount > 0.2) {
      options.onFallback("measured-draw-budget");
      dispose();
    }
  }
  resize(initial);
  await syncTextures(images, selected);
  if (disposed || !options.valid() || !textures.has(selected)) {
    dispose();
    return;
  }
  const initialPrints = images.map((_, i) =>
    printGeometry(i, selected, initial),
  );
  // Measure cadence and completed GPU work before exposing the canvas. This is
  // a short calibration only; there is no perpetual RAF loop or idle redraw.
  const intervals: number[] = [],
    costs: number[] = [];
  let previous = 0;
  for (let i = 0; i < motion.qualitySampleFrames; i++) {
    if (!options.valid() || disposed) {
      dispose();
      return;
    }
    const now = await new Promise<number>((resolve) => {
      resolveCalibration = resolve;
      calibrationFrame = requestAnimationFrame(resolve);
    });
    resolveCalibration = undefined;
    if (disposed || !options.valid()) {
      dispose();
      return;
    }
    if (previous) intervals.push(now - previous);
    previous = now;
    if (i % 6 === 0) {
      const start = performance.now();
      draw(initialPrints, initial, 0);
      context.finish();
      costs.push(performance.now() - start);
    }
  }
  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  const p90 = intervals[Math.floor(intervals.length * 0.9)];
  const drawMean = costs.reduce((a, b) => a + b, 0) / costs.length;
  stageElement.dataset.opticsCalibration = JSON.stringify({
    medianMs: +median.toFixed(2),
    p90Ms: +p90.toFixed(2),
    gpuDrawMeanMs: +drawMean.toFixed(2),
  });
  if (
    median > motion.maxFrameMs ||
    p90 > 40 ||
    drawMean > motion.maxDrawMs ||
    !options.valid()
  ) {
    dispose();
    return;
  }
  stageElement.append(canvas);
  draw(initialPrints, initial, 0);
  return { draw, resize, syncTextures, dispose };
}
