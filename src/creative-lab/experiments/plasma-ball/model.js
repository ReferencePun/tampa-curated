/** Reproducible electrical illustration, independent of Canvas and the Lab. */
export const DEFAULTS = Object.freeze({
  mode: "classic",
  filaments: 36,
  branching: 2,
  glow: 1,
  speed: 1,
  attraction: 1,
  palette: "violet",
  coreSize: 0.075,
  sphereSize: 1,
  flicker: 0.35,
  reflection: 0.65,
  darkness: 0.94,
  idle: true,
});
export const PALETTES = {
  violet: {
    name: "Violet discharge",
    colors: ["#b84cff", "#ec65e0", "#5687ff", "#ff87ba"],
    core: "#edb1ff",
  },
  arctic: {
    name: "Arctic current",
    colors: ["#3f97ff", "#56d7ff", "#adbcff", "#71ffe7"],
    core: "#c8f6ff",
  },
  ember: {
    name: "Rose & amber",
    colors: ["#ff745f", "#ffac56", "#ec599c", "#ffcba5"],
    core: "#ffe8cf",
  },
  spectral: {
    name: "Spectral glass",
    colors: ["#78e8cb", "#b78bff", "#f487bb", "#9fc8ff"],
    core: "#e0ffff",
  },
  monochrome: {
    name: "Silver voltage",
    colors: ["#9ba8c4", "#d0d5e5", "#8c98b3", "#f0e8ee"],
    core: "#ffffff",
  },
};
export const PRESETS = {
  classic: { name: "01 / Violet discharge", settings: { ...DEFAULTS } },
  touch: {
    name: "02 / A gathering of lightning",
    settings: {
      ...DEFAULTS,
      mode: "intense",
      filaments: 48,
      branching: 3,
      attraction: 1.5,
      glow: 1.15,
    },
  },
  ambient: {
    name: "03 / Deep-water current",
    settings: {
      ...DEFAULTS,
      mode: "ambient",
      filaments: 28,
      branching: 1,
      speed: 0.6,
      palette: "arctic",
      flicker: 0.15,
      glow: 0.8,
    },
  },
  ember: {
    name: "04 / Rose under glass",
    settings: {
      ...DEFAULTS,
      palette: "ember",
      filaments: 30,
      branching: 3,
      speed: 0.75,
      coreSize: 0.06,
    },
  },
  silver: {
    name: "05 / Quiet voltage",
    settings: {
      ...DEFAULTS,
      palette: "monochrome",
      mode: "ambient",
      filaments: 22,
      reflection: 0.85,
      glow: 0.75,
      flicker: 0.1,
    },
  },
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function options(input = {}) {
  const o = { ...DEFAULTS };
  for (const [key, min, max] of [
    ["filaments", 12, 80],
    ["branching", 0, 4],
    ["glow", 0.2, 1.8],
    ["speed", 0.1, 2],
    ["attraction", 0, 2],
    ["coreSize", 0.04, 0.14],
    ["sphereSize", 0.7, 1.1],
    ["flicker", 0, 1],
    ["reflection", 0, 1],
    ["darkness", 0.65, 1],
  ])
    if (Number.isFinite(Number(input[key])))
      o[key] = clamp(Number(input[key]), min, max);
  o.filaments = Math.round(o.filaments);
  o.branching = Math.round(o.branching);
  if (["classic", "intense", "ambient"].includes(input.mode))
    o.mode = input.mode;
  if (Object.hasOwn(PALETTES, input.palette)) o.palette = input.palette;
  if (typeof input.idle === "boolean") o.idle = input.idle;
  return o;
}
const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const normalize = (v) => {
  const d = Math.hypot(...v) || 1;
  return v.map((x) => x / d);
};
// Continuous, multi-frequency motion; bounded amplitudes avoid flashing/strobes.
function noise(u, t, s) {
  return (
    Math.sin(u * 10.7 + t * 0.8 + s) * 0.58 +
    Math.sin(u * 24.3 - t * 1.6 + s * 2) * 0.26 +
    Math.sin(u * 58.6 + t * 2.3 + s * 3) * 0.11 +
    Math.sin(u * 113.1 - t * 3.7 + s * 5) * 0.05
  );
}
export function project(v) {
  const p = 1 + v[2] * 0.12;
  return [v[0] * p, v[1] * p, v[2]];
}
/** Pointer coordinates are sphere-local. Front-hemisphere projection keeps contact registered. */
export function contactPoint(x, y) {
  const length = Math.hypot(x, y),
    r = Math.min(0.995, length);
  // Inverse weak perspective: r = sqrt(1-z²)*(1+.12z).
  let low = 0,
    high = 1;
  for (let i = 0; i < 22; i++) {
    const z = (low + high) / 2;
    if (Math.sqrt(1 - z * z) * (1 + 0.12 * z) > r) low = z;
    else high = z;
  }
  const z = (low + high) / 2,
    scale = length ? Math.sqrt(1 - z * z) / length : 0;
  return [x * scale, y * scale, z];
}
export class PlasmaField {
  constructor(settings = {}) {
    this.config = options(settings);
    this.time = 0;
    this.contact = { x: 0.65, y: -0.35, amount: 0, pressed: false };
    this.target = { ...this.contact };
    this.paths = [];
    this.rebuild();
  }
  rebuild() {
    this.paths = [];
    for (let i = 0; i < this.config.filaments; i++) {
      const seed = hash(i + 17) * TAU;
      this.paths.push({
        seed,
        index: i,
        color: i % 4,
        points: new Float32Array(57 * 3),
        strength: 1,
        branch: false,
      });
      for (let b = 0; b < this.config.branching; b++)
        this.paths.push({
          seed: seed + b * 1.7,
          index: i,
          color: i % 4,
          points: new Float32Array(25 * 3),
          strength: 0.4,
          branch: true,
          fork: 0.36 + hash(i * 19 + b + 8) * 0.42,
          parent: this.paths.find((p) => p.index === i && !p.branch),
          branchIndex: b,
        });
    }
    this.evaluate();
  }
  update(settings) {
    const old = this.config;
    this.config = options(settings);
    if (
      old.filaments !== this.config.filaments ||
      old.branching !== this.config.branching
    )
      this.rebuild();
    else this.evaluate();
  }
  point(x, y, pressed = false) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      this.release();
      return;
    }
    const distance = Math.hypot(x, y);
    this.target = {
      x,
      y,
      amount: clamp((1.4 - distance) / 0.45, 0, 1),
      pressed: !!pressed,
    };
  }
  release() {
    this.target.amount = 0;
    this.target.pressed = false;
  }
  advance(dt) {
    dt = Number.isFinite(dt) ? clamp(dt, 0, 0.05) : 0;
    const ease = 1 - Math.exp(-dt * 7);
    for (const k of ["x", "y", "amount"])
      this.contact[k] = mix(this.contact[k], this.target[k], ease);
    this.contact.pressed = this.target.pressed;
    if (this.config.idle || this.contact.amount > 0.001)
      this.time +=
        dt * this.config.speed * (this.config.mode === "ambient" ? 0.38 : 1);
    this.evaluate();
  }
  settleInput() {
    this.contact = { ...this.target };
    this.evaluate();
  }
  reset() {
    this.time = 0;
    this.release();
    this.contact.amount = 0;
    this.evaluate();
  }
  evaluate() {
    const c = this.config,
      t = this.time,
      pointer = contactPoint(this.contact.x, this.contact.y),
      pressed = this.contact.pressed ? 1.23 : 1;
    let meanDistance = 0,
      attracted = 0;
    for (const path of this.paths) {
      const { seed, index: i } = path;
      if (!path.branch) {
        const azimuth = i * 2.399963 + Math.sin(t * 0.17 + seed) * 0.3;
        const z = Math.sin(seed * 7.3 + t * 0.11) * 0.8;
        let end = [
          Math.cos(azimuth) * Math.sqrt(1 - z * z),
          Math.sin(azimuth) * Math.sqrt(1 - z * z),
          z,
        ];
        const participation = hash(i * 7 + 91) < 0.73 ? 1 : 0.14;
        const pull = clamp(
          this.contact.amount *
            c.attraction *
            participation *
            pressed *
            (c.mode === "intense" ? 1.35 : 1),
          0,
          0.985,
        );
        const spread = 0.018 + hash(i + 22) * 0.055;
        const focus = normalize([
          pointer[0] + Math.cos(seed + t * 0.2) * spread,
          pointer[1] + Math.sin(seed + t * 0.3) * spread,
          pointer[2],
        ]);
        end = normalize(end.map((v, k) => mix(v, focus[k], pull)));
        path.end = end;
        path.pull = pull;
        path.strength =
          (0.66 + (0.34 * (end[2] + 1)) / 2) *
          (1 + c.flicker * 0.16 * Math.sin(t * 12 + seed)) *
          (1 + pull * 0.85) *
          (1 + pull * (pressed - 1)) *
          (1 - pull * (i % 7 === 0 ? 0 : 0.88));
        path.width =
          (0.7 + hash(i + 13) * 0.65) *
          (1 + pull * (c.mode === "intense" ? 1.5 : 0.7)) *
          (1 + pull * (pressed - 1) * 1.4);
        for (let j = 0; j < 57; j++) {
          const u = j / 56,
            env = Math.sin(Math.PI * u),
            rad = mix(c.coreSize * 0.8, 1, u),
            bend = 0.055 + 0.08 * hash(i + 6);
          let v = end.map(
            (e, k) =>
              e * rad +
              env *
                (noise(u, t, seed + k * 2.3) * bend +
                  Math.sin(u * 3 + seed + k + t * 0.3) * 0.065),
          );
          const len = Math.hypot(...v);
          if (len > 1) v = v.map((x) => x / len);
          const q = project(v);
          path.points.set(q, j * 3);
        }
        if (participation === 1) {
          const q = project(end);
          meanDistance += Math.hypot(
            q[0] - this.contact.x,
            q[1] - this.contact.y,
          );
          attracted++;
        }
      } else {
        const parent = path.parent,
          j = Math.round(path.fork * 56),
          start = Array.from(parent.points.slice(j * 3, j * 3 + 3));
        const spread = (0.13 + hash(seed + 5) * 0.25) * (1 - parent.pull * 0.6),
          a = seed * 2 + t * 0.13;
        const end = project(
          normalize([
            parent.end[0] + Math.cos(a) * spread,
            parent.end[1] + Math.sin(a) * spread,
            parent.end[2] + Math.sin(seed) * spread,
          ]),
        );
        path.strength = parent.strength * (0.25 + 0.2 * hash(seed));
        path.width = 0.55 + hash(seed) * 0.45;
        for (let n = 0; n < 25; n++) {
          const u = n / 24,
            env = Math.sin(u * Math.PI);
          for (let k = 0; k < 3; k++)
            path.points[n * 3 + k] =
              mix(start[k], end[k], u) +
              env * noise(u, t, seed + k * 3) * 0.035;
        }
      }
    }
    this.meanContactDistance = meanDistance / Math.max(1, attracted);
    return this.paths;
  }
  snapshot() {
    return {
      time: this.time,
      contact: { ...this.contact },
      paths: this.paths.length,
      filaments: this.config.filaments,
      meanContactDistance: this.meanContactDistance,
    };
  }
}
