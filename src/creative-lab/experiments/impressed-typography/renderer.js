import {
  options,
  MATERIALS,
  lightVector,
  hexRGB,
  signedDepth,
  pressState,
  grainMap,
} from "./model.js";
import { createGlyphMap } from "./glyphs.js";
import { vertex, fragment } from "./shaders.js";
export function createImpression(canvas, initial = {}) {
  let settings = options(initial),
    disposed = false,
    lost = false,
    glyphMap,
    builds = 0,
    frames = 0;
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  if (!gl) throw new Error("WebGL is unavailable");
  const resources = { shaders: [], textures: [] };
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      resources.shaders.forEach((handle) => gl.deleteShader(handle));
      gl.deleteProgram(program);
      throw new Error(error);
    }
    resources.shaders.push(s);
    return s;
  }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    resources.shaders.forEach((handle) => gl.deleteShader(handle));
    gl.deleteProgram(program);
    throw new Error(error);
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const attribute = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
  function texture(unit) {
    const t = gl.createTexture();
    resources.textures.push(t);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      unit ? gl.REPEAT : gl.CLAMP_TO_EDGE,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      unit ? gl.REPEAT : gl.CLAMP_TO_EDGE,
    );
    return t;
  }
  const glyphTexture = texture(0);
  texture(1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    256,
    256,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    grainMap(),
  );
  const u = {};
  for (const name of [
    "glyph",
    "grain",
    "texel",
    "paper",
    "ink",
    "light",
    "depth",
    "roughness",
    "fiber",
    "specular",
    "intensity",
    "highlight",
    "softness",
    "pressed",
    "inked",
    "aged",
    "contrast",
  ])
    u[name] = gl.getUniformLocation(program, name);
  gl.uniform1i(u.glyph, 0);
  gl.uniform1i(u.grain, 1);
  function rebuild() {
    glyphMap?.dispose();
    glyphMap = createGlyphMap(settings);
    builds++;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glyphTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    const flipped = new Uint8Array(glyphMap.data.length),
      row = glyphMap.width * 4;
    for (let y = 0; y < glyphMap.height; y++)
      flipped.set(
        glyphMap.data.subarray(y * row, (y + 1) * row),
        (glyphMap.height - 1 - y) * row,
      );
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      glyphMap.width,
      glyphMap.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      flipped,
    );
    gl.uniform2f(u.texel, 1 / glyphMap.width, 1 / glyphMap.height);
  }
  function render() {
    if (disposed || lost) return;
    const m = MATERIALS[settings.material];
    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform3fv(u.paper, hexRGB(settings.paper));
    gl.uniform3fv(u.ink, hexRGB(settings.ink));
    gl.uniform3fv(u.light, lightVector(settings.azimuth, settings.elevation));
    for (const [name, value] of Object.entries({
      depth: signedDepth(settings) / 800,
      roughness: settings.roughness,
      fiber: m.fiber,
      specular: m.specular,
      intensity: settings.intensity,
      highlight: settings.highlight,
      softness: settings.shadow,
      pressed: pressState(settings.progress).pressure,
      inked: settings.treatment === "letterpress" ? 1 : 0,
      aged: settings.material === "archive" ? 1 : 0,
      contrast: settings.contrast ? 1 : 0,
    }))
      gl.uniform1f(u[name], value);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    frames++;
  }
  rebuild();
  return {
    render,
    update(next) {
      if (disposed) return;
      const before = settings;
      settings = options({ ...settings, ...next });
      if (
        ["text", "font", "weight", "size", "spacing"].some(
          (k) => before[k] !== settings[k],
        )
      )
        rebuild();
      render();
    },
    resize(width) {
      if (disposed) return;
      canvas.width = Math.max(
        300,
        Math.min(
          1500,
          Math.round(width * Math.min(devicePixelRatio || 1, 1.5)),
        ),
      );
      canvas.height = Math.round(canvas.width / 1.5);
      render();
    },
    getGlyph: () => glyphMap,
    getSettings: () => ({ ...settings }),
    getState: () => ({
      builds,
      frames,
      disposed,
      width: canvas.width,
      height: canvas.height,
      depth: signedDepth(settings),
      pressure: pressState(settings.progress).pressure,
    }),
    setLost() {
      lost = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      glyphMap?.dispose();
      glyphMap = undefined;
      resources.textures.forEach((t) => gl.deleteTexture(t));
      resources.shaders.forEach((s) => gl.deleteShader(s));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      if (!lost) gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
