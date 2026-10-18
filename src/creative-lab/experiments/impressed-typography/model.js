export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const FONTS = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: "Arial, Helvetica, sans-serif",
  mono: '"Courier New", Courier, monospace',
};
export const MATERIALS = {
  cotton: {
    name: "Ivory cotton",
    paper: "#e9e4d7",
    roughness: 0.42,
    fiber: 0.45,
    specular: 0.08,
  },
  handmade: {
    name: "Handmade rag",
    paper: "#dbcdb3",
    roughness: 0.65,
    fiber: 0.8,
    specular: 0.06,
  },
  recycled: {
    name: "Recycled stock",
    paper: "#b7ac97",
    roughness: 0.85,
    fiber: 1,
    specular: 0.04,
  },
  charcoal: {
    name: "Charcoal paper",
    paper: "#353937",
    roughness: 0.45,
    fiber: 0.5,
    specular: 0.13,
  },
  archive: {
    name: "Archival paper",
    paper: "#d7c59e",
    roughness: 0.58,
    fiber: 0.65,
    specular: 0.06,
  },
  plaster: {
    name: "Painted plaster",
    paper: "#e3e1dc",
    roughness: 0.2,
    fiber: 0.08,
    specular: 0.19,
  },
};
export const DEFAULTS = {
  text: "MATTER\n& LIGHT",
  treatment: "emboss",
  material: "cotton",
  font: "serif",
  weight: 700,
  size: 170,
  spacing: 2,
  depth: 5,
  roughness: 0.42,
  paper: "#e9e4d7",
  ink: "#373b3b",
  azimuth: 140,
  elevation: 32,
  intensity: 1,
  highlight: 0.55,
  shadow: 0.45,
  progress: 100,
  contrast: false,
};
export const PRESETS = {
  blind: { name: "01 / Blind impression", settings: { ...DEFAULTS } },
  recess: {
    name: "02 / Quiet monument",
    settings: {
      ...DEFAULTS,
      text: "form\n& absence",
      treatment: "deboss",
      material: "plaster",
      font: "serif",
      weight: 400,
      size: 172,
      spacing: -2,
      paper: "#e3e1dc",
      roughness: 0.2,
      depth: 6,
    },
  },
  press: {
    name: "03 / Printer’s proof",
    settings: {
      ...DEFAULTS,
      text: "WORDS\nHAVE WEIGHT.",
      treatment: "letterpress",
      font: "sans",
      size: 150,
      weight: 700,
      spacing: 0,
      ink: "#953e33",
      material: "handmade",
      paper: "#dbcdb3",
      roughness: 0.65,
      depth: 5,
    },
  },
  night: {
    name: "04 / After dark",
    settings: {
      ...DEFAULTS,
      text: "NOCTURNE",
      material: "charcoal",
      paper: "#353937",
      roughness: 0.45,
      size: 120,
      spacing: 5,
      weight: 400,
      depth: 7,
      intensity: 1.3,
    },
  },
  archive: {
    name: "05 / Field notes",
    settings: {
      ...DEFAULTS,
      text: "FIELD NOTES\nNo. 020",
      treatment: "letterpress",
      font: "mono",
      size: 130,
      spacing: 1,
      material: "archive",
      paper: "#d7c59e",
      roughness: 0.58,
      ink: "#394c5a",
    },
  },
};
const limits = {
  weight: [400, 700],
  size: [32, 220],
  spacing: [-4, 16],
  depth: [0, 12],
  roughness: [0, 1],
  azimuth: [0, 360],
  elevation: [12, 80],
  intensity: [0.2, 2],
  highlight: [0, 1],
  shadow: [0, 1],
  progress: [0, 100],
};
export function options(input = {}) {
  const s = { ...DEFAULTS, ...input };
  for (const [k, [a, b]] of Object.entries(limits))
    s[k] = clamp(Number.isFinite(+s[k]) ? +s[k] : DEFAULTS[k], a, b);
  s.text = String(s.text).slice(0, 240);
  s.font = FONTS[s.font] ? s.font : "serif";
  s.material = MATERIALS[s.material] ? s.material : "cotton";
  s.treatment = ["emboss", "deboss", "letterpress"].includes(s.treatment)
    ? s.treatment
    : "emboss";
  for (const k of ["paper", "ink"])
    if (!/^#[\da-f]{6}$/i.test(s[k])) s[k] = DEFAULTS[k];
  s.contrast = !!s.contrast;
  return Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, s[k]]));
}
export function pressState(progress) {
  const p = clamp(progress / 100);
  return {
    pressure: smooth(0.32, 0.64, p),
    lift: 1 - smooth(0.05, 0.32, p) + smooth(0.68, 0.94, p),
    visible: p > 0.01 && p < 0.99,
    phase:
      p < 0.05
        ? "Flat sheet"
        : p < 0.32
          ? "Plate descending"
          : p < 0.64
            ? "Under pressure"
            : p < 0.94
              ? "Plate lifting"
              : "Impression retained",
  };
}
export function signedDepth(settings) {
  return (
    (settings.treatment === "emboss"
      ? 1
      : settings.treatment === "deboss"
        ? -1
        : -0.48) *
    settings.depth *
    pressState(settings.progress).pressure
  );
}
export function lightVector(azimuth, elevation) {
  const a = (azimuth * Math.PI) / 180,
    e = (elevation * Math.PI) / 180;
  return [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
}
export function normalFromGradient(dx, dy, depth = 1) {
  const n = [-dx * depth, -dy * depth, 1],
    l = Math.hypot(...n);
  return n.map((v) => v / l);
}
export const hexRGB = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
// Two-pass chamfer distance to a glyph edge; fractional antialias coverage remains in R.
export function bevelMap(alpha, width, height, radius = 5) {
  const n = width * height,
    d = new Float32Array(n),
    out = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) d[i] = alpha[i] > 127 ? 1e4 : 0;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) d[i] = Math.min(d[i], d[i - 1] + 1);
      if (y) {
        d[i] = Math.min(d[i], d[i - width] + 1);
        if (x) d[i] = Math.min(d[i], d[i - width - 1] + diagonal);
        if (x < width - 1) d[i] = Math.min(d[i], d[i - width + 1] + diagonal);
      }
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x < width - 1) d[i] = Math.min(d[i], d[i + 1] + 1);
      if (y < height - 1) {
        d[i] = Math.min(d[i], d[i + width] + 1);
        if (x) d[i] = Math.min(d[i], d[i + width - 1] + diagonal);
        if (x < width - 1) d[i] = Math.min(d[i], d[i + width + 1] + diagonal);
      }
      const edge = clamp((d[i] - 0.5) / radius);
      out[i * 4] = alpha[i];
      out[i * 4 + 1] = Math.round((255 * smooth(0, 1, edge) * alpha[i]) / 255);
      out[i * 4 + 2] = Math.round(255 * edge);
      out[i * 4 + 3] = 255;
    }
  return out;
}
export function grainMap(size = 256) {
  const data = new Uint8Array(size * size * 4);
  let seed = 94123;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4,
        n = rand();
      data[i] = Math.round(100 + n * 55);
      data[i + 1] = Math.round(rand() * 255);
      data[i + 2] = rand() > 0.992 ? 80 : 255;
      data[i + 3] = 255;
    }
  for (let f = 0; f < 1800; f++) {
    const x = (rand() * size) | 0,
      y = (rand() * size) | 0,
      len = 2 + ((rand() * 10) | 0),
      shade = rand() > 0.5 ? 155 : 95;
    for (let j = 0; j < len; j++) {
      const i = (((y + ((j * 0.25) | 0)) % size) * size + ((x + j) % size)) * 4;
      data[i] = shade;
    }
  }
  return data;
}
