export const DEFAULTS = Object.freeze({
  mode: "reveal",
  photo: "palms",
  radius: 14,
  displacement: 24,
  scatter: 0,
  density: 320,
  markSize: 1,
  contrast: 1.15,
  settle: 1,
  trail: 1.2,
  surface: "night",
  ink: "#dfb879",
  original: false,
  guides: true,
  seed: 7,
});
export const PRESETS = Object.freeze({
  reference: {
    name: "01 / Amber photographic dust",
    settings: { ...DEFAULTS },
  },
  etching: {
    name: "02 / Drypoint & graphite",
    settings: {
      ...DEFAULTS,
      mode: "engraving",
      surface: "paper",
      ink: "#343129",
      density: 300,
      radius: 23,
    },
  },
  dust: {
    name: "03 / An image in flight",
    settings: {
      ...DEFAULTS,
      mode: "scatter",
      scatter: 36,
      displacement: 55,
      markSize: 0.85,
      ink: "#dfb879",
    },
  },
  emulsion: {
    name: "04 / Beneath the emulsion",
    settings: {
      ...DEFAULTS,
      mode: "reveal",
      radius: 28,
      displacement: 20,
      density: 360,
    },
  },
  portrait: {
    name: "05 / A portrait in stipple",
    settings: {
      ...DEFAULTS,
      photo: "portrait",
      density: 360,
      markSize: 0.85,
      contrast: 1.3,
    },
  },
});
export function options(value = {}) {
  const s = { ...DEFAULTS, ...value };
  for (const [key, [a, b]] of Object.entries({
    radius: [6, 45],
    displacement: [0, 100],
    scatter: [0, 100],
    density: [120, 420],
    markSize: [0.5, 1.7],
    contrast: [0.65, 1.8],
    settle: [0.4, 2.4],
    trail: [0.1, 2.4],
    seed: [1, 999],
  }))
    if (!Number.isFinite(s[key]) || s[key] < a || s[key] > b)
      throw new Error(`Invalid ${key}.`);
  if (
    !["night", "paper"].includes(s.surface) ||
    !["engraving", "scatter", "reveal"].includes(s.mode) ||
    !["palms", "portrait", "facade"].includes(s.photo) ||
    !/^#[0-9a-f]{6}$/i.test(s.ink) ||
    typeof s.original !== "boolean" ||
    typeof s.guides !== "boolean"
  )
    throw new Error("Invalid photographic settings.");
  return s;
}
export const clamp = (v) => Math.max(0, Math.min(1, v));
export function random(seed) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export function fitImage(width, height, aspect, padding = 28) {
  const w = Math.max(1, width - padding * 2),
    h = Math.max(1, height - padding * 2),
    iw = Math.min(w, h * aspect),
    ih = iw / aspect;
  return [(width - iw) / 2, (height - ih) / 2, iw, ih];
}
// Each immutable anchor carries image-derived luminance, contour direction,
// gradient strength, two independent random values, and its source color.
export function samplePixels({ data, width, height }, seed = 7) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 180000 ||
    data.length !== width * height * 4
  )
    throw new Error("Expected a bounded RGBA sampling grid.");
  const count = width * height,
    luma = new Float32Array(count),
    attributes = new Float32Array(count * 10),
    rng = random(seed);
  for (let i = 0; i < count; i++)
    luma[i] =
      (data[i * 4] * 0.2126 +
        data[i * 4 + 1] * 0.7152 +
        data[i * 4 + 2] * 0.0722) /
      255;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        dx =
          luma[y * width + Math.min(width - 1, x + 1)] -
          luma[y * width + Math.max(0, x - 1)],
        dy =
          luma[Math.min(height - 1, y + 1) * width + x] -
          luma[Math.max(0, y - 1) * width + x];
      attributes.set(
        [
          (x + 0.5) / width,
          (y + 0.5) / height,
          luma[i],
          Math.min(1, Math.hypot(dx, dy) * 2),
          Math.atan2(dy, dx) + Math.PI / 2,
          rng(),
          rng(),
          data[i * 4] / 255,
          data[i * 4 + 1] / 255,
          data[i * 4 + 2] / 255,
        ],
        i * 10,
      );
    }
  return {
    attributes,
    count,
    columns: width,
    rows: height,
    aspect: width / height,
  };
}
export function frameState(settings = DEFAULTS) {
  return {
    x: 0.5,
    y: 0.5,
    active: 0,
    scatter: settings.scatter / 100,
    original: settings.original ? 1 : 0,
    velocity: 0,
  };
}
export function advance(state, target, dt, settle = 1) {
  const k = 1 - Math.exp((-Math.min(0.05, Math.max(0, dt)) * 9) / settle);
  let moving = false;
  for (const key of ["x", "y", "active", "scatter", "original", "velocity"]) {
    const delta = target[key] - state[key];
    if (Math.abs(delta) < 0.00015) state[key] = target[key];
    else {
      state[key] += delta * k;
      moving = true;
    }
  }
  return moving;
}
export function localField(u, v, seed, frame, settings, view) {
  const dx = (u - frame.x) * view[2],
    dy = (v - frame.y) * view[3],
    radius =
      ((Math.min(view[2], view[3]) * settings.radius) / 100) *
      (0.83 + seed * 0.3),
    distance = Math.hypot(dx, dy),
    t = clamp((1 - distance / radius) / 0.62);
  return t * t * (3 - 2 * t) * frame.active;
}
// CPU fallback and numerical diagnostics use the same displacement equations
// as the vertex shader. Photographic reconstruction is a separate fixed pass.
export function particlePose(sample, index, frame, settings, view, wake) {
  const a = sample.attributes,
    i = index * 10,
    u = a[i],
    v = a[i + 1],
    r = a[i + 5],
    q = a[i + 6],
    field = wake
      ? wake.sample(u, v)
      : localField(u, v, q, frame, settings, view),
    original = frame.original;
  const dx = (u - frame.x) * view[2],
    dy = (v - frame.y) * view[3],
    d = Math.max(1, Math.hypot(dx, dy)),
    nx = dx / d,
    ny = dy / d;
  const force =
      ((field *
        (1 - field) *
        settings.displacement *
        Math.min(view[2], view[3])) /
        500) *
      (1 - original),
    angle = r * Math.PI * 2;
  const spread =
    frame.scatter *
    (1 - original) *
    Math.min(view[2], view[3]) *
    (0.22 + q * 0.72);
  const flow=wake?wake.flow(u,v):null;
  const waveScale=Math.min(view[2],view[3])*(settings.displacement/24)*(.72+q*.56)*(1-original);
  const x =
    view[0] +
    u * view[2] +
    (flow?flow[0]*waveScale:(nx + -ny * (q - 0.5)) * force) +
    Math.cos(angle) * spread;
  const y =
    view[1] +
    v * view[3] +
    (flow?flow[1]*waveScale:(ny + nx * (q - 0.5)) * force) +
    Math.sin(angle) * spread;
  return { x, y, field, spread };
}
