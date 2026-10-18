export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mod = (v, n) => ((v % n) + n) % n;
export const DEFAULTS = {
  source: "glass",
  mirrors: 7,
  rotation: 0,
  rotationSpeed: 1.2,
  zoom: 1.1,
  palette: "jewel",
  softness: 0.12,
  interaction: "stir",
  animationSpeed: 0.35,
  border: "brass",
  brush: 5,
  ink: "#e4a65c",
};
export const PALETTES = {
  jewel: {
    name: "Jewel box",
    bg: "#091d28",
    colors: ["#d97746", "#d8aa5b", "#3faaa5", "#32769b", "#b55b81", "#e7c98b"],
    ink: "#253d49",
  },
  tide: {
    name: "Sea glass",
    bg: "#122e35",
    colors: ["#8bc6b4", "#518a9c", "#d6ca91", "#b7d4cb", "#376b83", "#c68c72"],
    ink: "#345960",
  },
  dusk: {
    name: "Velvet dusk",
    bg: "#241c34",
    colors: ["#d88891", "#ac83aa", "#c3a35a", "#605793", "#e0b8a5", "#8d5672"],
    ink: "#483e55",
  },
  ember: {
    name: "Honey & vermilion",
    bg: "#2a1c1b",
    colors: ["#ca583c", "#dda24a", "#eed49a", "#9d493b", "#b47b52", "#6f9b91"],
    ink: "#5b4033",
  },
  mono: {
    name: "Ink on ivory",
    bg: "#e9e3d2",
    colors: ["#233a51", "#767366", "#ae5545", "#43463f", "#998b6b", "#325764"],
    ink: "#373d3b",
  },
};
export const SOURCES = {
  glass: "Cut glass",
  lines: "Ink herbarium",
  image: "Photograph",
  particles: "Drifting beads",
  toys: "Little treasures",
  drawing: "Draw into the mirrors",
};
export const PRESETS = {
  jewel: { name: "01 · Cabinet of light", settings: { ...DEFAULTS } },
  tide: {
    name: "02 · Sea-glass tide",
    settings: {
      ...DEFAULTS,
      mirrors: 5,
      palette: "tide",
      zoom: 0.85,
      animationSpeed: 0.25,
      rotationSpeed: -0.8,
    },
  },
  herbarium: {
    name: "03 · Infinite herbarium",
    settings: {
      ...DEFAULTS,
      source: "lines",
      palette: "mono",
      mirrors: 6,
      zoom: 1.25,
      rotationSpeed: 0.5,
      border: "ivory",
      softness: 0,
    },
  },
  beads: {
    name: "04 · Constellation box",
    settings: {
      ...DEFAULTS,
      source: "particles",
      mirrors: 9,
      palette: "dusk",
      zoom: 0.9,
      rotationSpeed: 0.7,
    },
  },
  toys: {
    name: "05 · A pocket of wonders",
    settings: {
      ...DEFAULTS,
      source: "toys",
      palette: "ember",
      mirrors: 4,
      zoom: 0.9,
      rotationSpeed: -0.6,
    },
  },
  photo: {
    name: "06 · Palms into lace",
    settings: {
      ...DEFAULTS,
      source: "image",
      mirrors: 8,
      zoom: 1.35,
      rotationSpeed: 0.5,
      animationSpeed: 0.2,
      border: "graphite",
    },
  },
  draw: {
    name: "07 · A line, multiplied",
    settings: {
      ...DEFAULTS,
      source: "drawing",
      mirrors: 6,
      palette: "mono",
      zoom: 1,
      rotationSpeed: 0,
      animationSpeed: 0,
      border: "ivory",
      ink: "#244b78",
      softness: 0,
    },
  },
};
const ranges = {
  mirrors: [3, 16],
  rotation: [0, 360],
  rotationSpeed: [-6, 6],
  zoom: [0.6, 2.4],
  softness: [0, 1],
  animationSpeed: [0, 2],
  brush: [1, 18],
};
export function options(s = {}) {
  const c = { ...DEFAULTS };
  for (const k in ranges) {
    const v = Number(s[k]);
    if (s[k] !== undefined && Number.isFinite(v)) c[k] = clamp(v, ...ranges[k]);
  }
  c.mirrors = Math.round(c.mirrors);
  for (const [k, allowed] of Object.entries({
    source: Object.keys(SOURCES),
    palette: Object.keys(PALETTES),
    interaction: ["stir", "rotate", "off"],
    border: ["brass", "graphite", "ivory", "none"],
  }))
    if (allowed.includes(s[k])) c[k] = s[k];
  if (/^#[\da-f]{6}$/i.test(s.ink)) c.ink = s.ink;
  return c;
}
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeObjects(seed = 31) {
  const r = random(seed);
  return Array.from({ length: 85 }, (_, i) => ({
    id: i,
    x: r() * 1.9 - 0.85,
    y: r() * 1.9 - 0.95,
    size: 0.045 + r() * 0.14,
    angle: r() * TAU,
    kind: i % 6,
    color: Math.floor(r() * 6),
    phase: r() * TAU,
    rate: 0.5 + r(),
    dx: 0,
    dy: 0,
  }));
}
export function objectPosition(o, time, mode) {
  const amp = mode === "particles" ? 0.12 : 0.035;
  return {
    x: o.x + o.dx + Math.sin(time * 0.28 * o.rate + o.phase) * amp,
    y: o.y + o.dy + Math.cos(time * 0.22 * o.rate + o.phase) * amp,
    angle: o.angle + Math.sin(time * 0.17 + o.phase) * 0.45,
  };
}
export function opticalState(config, time, pan = { x: 0, y: 0 }) {
  return {
    angle: ((config.rotation + time.rotation) * Math.PI) / 180,
    sourceAngle: Math.sin(time.source * 0.09) * 0.3,
    pan: {
      x: pan.x - 0.22 + Math.sin(time.source * 0.13) * 0.06,
      y: pan.y - 0.12 + Math.cos(time.source * 0.11) * 0.04,
    },
  };
}
/** Fold a point in the output unit disc into one common source chamber. */
export function foldPoint(
  x,
  y,
  c,
  time = { rotation: 0, source: 0 },
  pan = { x: 0, y: 0 },
) {
  const s = opticalState(c, time, pan),
    w = Math.PI / c.mirrors,
    angle = mod(Math.atan2(y, x) - s.angle, 2 * w),
    a = angle > w ? 2 * w - angle : angle,
    r = Math.hypot(x, y) / c.zoom,
    qx = r * Math.cos(a),
    qy = r * Math.sin(a),
    cs = Math.cos(s.sourceAngle),
    sn = Math.sin(s.sourceAngle);
  const reflect = (v) => {
    const t = mod(v + 1, 4);
    return t <= 2 ? t - 1 : 3 - t;
  };
  return {
    x: reflect(qx * cs - qy * sn + s.pan.x),
    y: reflect(qx * sn + qy * cs + s.pan.y),
  };
}
export function sectorTransform(i, c, time) {
  const w = Math.PI / c.mirrors;
  return {
    angle: (i + (i % 2)) * w + opticalState(c, time).angle,
    flip: i % 2 ? -1 : 1,
    wedge: w,
  };
}
export function createState(seed = 31) {
  return {
    seed,
    objects: makeObjects(seed),
    pan: { x: 0, y: 0 },
    time: { rotation: 0, source: 0 },
    strokes: [],
  };
}
export function validateDocument(raw) {
  if (!raw || raw.type !== "impossible-kaleidoscope" || raw.version !== 1)
    throw Error("Choose a Kaleidoscope composition JSON file.");
  const finite = (v, a, b) =>
    typeof v === "number" && Number.isFinite(v) && v >= a && v <= b;
  const s = raw.state;
  if (
    !s ||
    !finite(s.seed, 0, 4294967295) ||
    !finite(s.pan?.x, -0.8, 0.8) ||
    !finite(s.pan?.y, -0.8, 0.8) ||
    !finite(s.time?.rotation, -1e9, 1e9) ||
    !finite(s.time?.source, 0, 1e9)
  )
    throw Error("Invalid optical state.");
  if (
    !Array.isArray(s.objects) ||
    s.objects.length !== 85 ||
    s.objects.some(
      (o, i) => o.id !== i || !finite(o.dx, -2, 2) || !finite(o.dy, -2, 2),
    )
  )
    throw Error("Invalid source arrangement.");
  if (!Array.isArray(s.strokes) || s.strokes.length > 400)
    throw Error("Too many drawing strokes.");
  let count = 0;
  for (const stroke of s.strokes) {
    if (
      !/^#[\da-f]{6}$/i.test(stroke.color) ||
      !finite(stroke.width, 1, 18) ||
      !Array.isArray(stroke.points) ||
      !stroke.points.length
    )
      throw Error("Invalid drawing stroke.");
    for (const p of stroke.points) {
      if (!finite(p.x, -2, 2) || !finite(p.y, -2, 2))
        throw Error("Invalid drawing point.");
      count++;
    }
  }
  if (count > 60000) throw Error("Drawing exceeds 60,000 points.");
  if (
    raw.image &&
    (typeof raw.image !== "string" ||
      raw.image.length > 6000000 ||
      !/^data:image\/(jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(raw.image))
  )
    throw Error("Invalid embedded image.");
  return {
    config: options(raw.config),
    state: {
      seed: s.seed,
      objects: makeObjects(s.seed).map((o, i) => ({
        ...o,
        dx: s.objects[i].dx,
        dy: s.objects[i].dy,
      })),
      pan: { ...s.pan },
      time: { ...s.time },
      strokes: structuredClone(s.strokes),
    },
    image: raw.image || null,
  };
}
