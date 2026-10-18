/** A deterministic thermal parcel model; the renderer extracts one continuous wax surface. */
export const DEFAULTS = Object.freeze({
  mode: "classic",
  blobs: 12,
  viscosity: 1,
  rise: 1,
  merge: 1,
  split: 1,
  palette: "ember",
  height: 1,
  glow: 1,
  opacity: 0.35,
  base: "brushed",
  ambient: 0.65,
  speed: 1,
});
export const PALETTES = {
  ember: {
    name: "Ember / orange & red",
    wax: "#fa4619",
    hot: "#ffc16b",
    liquid: "#4c131c",
    light: "#ff7432",
  },
  orchid: {
    name: "Orchid / purple & pink",
    wax: "#db4d9e",
    hot: "#ffc1ec",
    liquid: "#301342",
    light: "#a270ff",
  },
  lagoon: {
    name: "Lagoon / blue & green",
    wax: "#49d9b0",
    hot: "#d1ffc1",
    liquid: "#123046",
    light: "#38b4c0",
  },
  pearl: {
    name: "Pearl / milky white",
    wax: "#d1d3d9",
    hot: "#ffffff",
    liquid: "#282d37",
    light: "#c2d6ed",
  },
  neon: {
    name: "After hours / acid & violet",
    wax: "#c2ee24",
    hot: "#f1ffac",
    liquid: "#2e1242",
    light: "#bd69f2",
  },
};
export const PRESETS = {
  ember: { name: "01 / Slow Sunday", settings: { ...DEFAULTS } },
  orchid: {
    name: "02 / Velvet hour",
    settings: {
      ...DEFAULTS,
      palette: "orchid",
      viscosity: 1.4,
      speed: 0.7,
      merge: 1.3,
    },
  },
  lagoon: {
    name: "03 / Tidal dream",
    settings: {
      ...DEFAULTS,
      palette: "lagoon",
      blobs: 16,
      split: 1.4,
      base: "ceramic",
    },
  },
  ambient: {
    name: "04 / A room of warm water",
    settings: {
      ...DEFAULTS,
      mode: "ambient",
      palette: "ember",
      blobs: 18,
      speed: 0.6,
      glow: 0.8,
      opacity: 0.55,
    },
  },
  pearl: {
    name: "05 / Almost still",
    settings: {
      ...DEFAULTS,
      mode: "column",
      palette: "pearl",
      blobs: 9,
      viscosity: 1.6,
      speed: 0.5,
      base: "dark",
    },
  },
  neon: {
    name: "06 / After hours",
    settings: {
      ...DEFAULTS,
      palette: "neon",
      split: 1.5,
      glow: 1.2,
      base: "dark",
    },
  },
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function options(input = {}) {
  const c = { ...DEFAULTS };
  for (const [k, a, b] of [
    ["blobs", 6, 24],
    ["viscosity", 0.3, 2],
    ["rise", 0.3, 2],
    ["merge", 0, 2],
    ["split", 0, 2],
    ["height", 0.75, 1.15],
    ["glow", 0, 1.8],
    ["opacity", 0, 1],
    ["ambient", 0, 1],
    ["speed", 0.2, 3],
  ])
    if (Number.isFinite(input[k])) c[k] = clamp(input[k], a, b);
  c.blobs = Math.round(c.blobs);
  for (const [k, values] of [
    ["mode", ["classic", "ambient", "column"]],
    ["palette", Object.keys(PALETTES)],
    ["base", ["brushed", "dark", "ceramic"]],
  ])
    if (values.includes(input[k])) c[k] = input[k];
  return c;
}
export const hash = (n) => {
  const a = Math.sin(n * 127.1 + 78.233) * 43758.5453;
  return a - Math.floor(a);
};
export function wall(y, mode = "classic") {
  if (mode === "ambient") return 0.7;
  if (mode === "column") return 0.48;
  const u = clamp(y / 2.4, 0, 1);
  return 0.46 - 0.2 * u + 0.085 * Math.sin(u * Math.PI);
}
/** Elliptical Gaussian density, with analytic gradient. Identical to the shader field. */
export function sampleField(x, y, parcels, merge = 1) {
  let density = 0,
    gx = 0,
    gy = 0,
    temperature = 0;
  const softness = 2.7 - merge * 0.42;
  for (const p of parcels) {
    const dx = x - p.x,
      dy = y - p.y,
      cs = Math.cos(p.angle),
      sn = Math.sin(p.angle),
      a = (dx * cs + dy * sn) / p.rx,
      b = (-dx * sn + dy * cs) / p.ry;
    const f = 2.8 * Math.exp(-softness * (a * a + b * b));
    density += f;
    temperature += f * p.temperature;
    gx += f * (-2 * softness) * ((a * cs) / p.rx - (b * sn) / p.ry);
    gy += f * (-2 * softness) * ((a * sn) / p.rx + (b * cs) / p.ry);
  }
  return {
    density,
    gx,
    gy,
    temperature: temperature / Math.max(0.00001, density),
  };
}
export class WaxField {
  constructor(settings = {}) {
    this.config = options(settings);
    this.time = 0;
    this.accumulator = 0;
    this.parcels = [];
    this.reset();
  }
  reset() {
    this.time = 0;
    this.accumulator = 0;
    const c = this.config,
      n = c.blobs;
    this.parcels = Array.from({ length: n }, (_, i) => {
      const band = Math.floor(i / 3),
        y = 0.12 + (band / (Math.ceil(n / 3) - 1)) * 2.04;
      return {
        id: i,
        mass: ((0.8 + hash(i + 2) * 0.4) * 1.12) / n,
        x: ((i % 3) - 1) * (0.075 + hash(i + 10) * 0.05),
        y: y + (i % 3) * 0.035,
        vx: (hash(i + 4) - 0.5) * 0.012,
        vy: i % 3 === 0 ? -0.025 : 0.035,
        temperature:
          y < 0.3 ? 0.86 : y > 1.9 ? 0.22 : i % 3 === 0 ? 0.27 : 0.78,
        cycle: y > 1.9 || i % 3 === 0 ? -1 : 1,
        rx: 0,
        ry: 0,
        angle: 0,
        strain: 0,
      };
    });
    const total = this.parcels.reduce((s, p) => s + p.mass, 0);
    for (const p of this.parcels) p.mass *= 1.12 / total;
    this.shape();
  }
  update(values) {
    const old = this.config;
    this.config = options(values);
    if (old.blobs !== this.config.blobs) this.reset();
    else this.shape();
  }
  shape() {
    const c = this.config;
    for (const p of this.parcels) {
      const radius = Math.sqrt(p.mass / Math.PI) * 1.5;
      const pool = clamp((0.28 - p.y) / 0.22, 0, 1);
      const stretch = clamp(
        1 +
          (Math.abs(p.vy) * 7) / (0.5 + c.viscosity) +
          p.strain * 0.25 -
          pool * 0.4,
        0.65,
        1.85,
      );
      p.rx = radius / Math.sqrt(stretch);
      p.ry = radius * Math.sqrt(stretch);
      p.angle =
        clamp(p.vx * 5, -0.32, 0.32) +
        Math.sin(this.time * 0.23 + p.id * 2) * 0.055;
      const side = Math.max(0.03, wall(p.y, c.mode) - p.rx * 0.54);
      p.x = clamp(p.x, -side, side);
    }
  }
  step(dt) {
    const c = this.config,
      ps = this.parcels;
    this.time += dt;
    const forces = ps.map(() => [0, 0]);
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i],
          b = ps[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.max(0.001, Math.hypot(dx, dy)),
          reach = (a.rx + b.rx) * 1.65;
        if (d > reach) continue;
        const normalized = d / (a.rx + b.rx),
          cohesion = c.merge * 0.019 * Math.max(0, 1 - d / reach),
          pressure = 0.028 * Math.max(0, 0.63 - normalized),
          shear = c.split * 0.014 * Math.abs(a.temperature - b.temperature);
        const force = cohesion - pressure - shear;
        const fx = (dx / d) * force,
          fy = (dy / d) * force;
        forces[i][0] += fx;
        forces[i][1] += fy;
        forces[j][0] -= fx;
        forces[j][1] -= fy;
      }
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i],
        u = clamp(p.y / 2.4, 0, 1);
      if (u < 0.045 + hash(p.id + 71) * 0.035) p.cycle = 1;
      if (u > 0.8 + hash(p.id + 72) * 0.1) p.cycle = -1;
      const target = p.cycle === 1 ? 0.86 : 0.14,
        rate =
          p.cycle === 1
            ? 0.025 + 0.32 * Math.pow(1 - u, 5)
            : 0.025 + 0.29 * Math.pow(u, 5);
      p.temperature = clamp(
        p.temperature + (target - p.temperature) * rate * dt,
        0,
        1,
      );
      const convection =
        Math.sin(this.time * 0.15 + p.id * 1.7 + p.y * 2) * 0.004 +
        (p.x > 0 ? 1 : -1) * 0.003 * Math.sin(p.y * 2.7);
      p.vx +=
        (forces[i][0] + convection - p.vx * (0.9 + c.viscosity * 0.65)) * dt;
      p.vy +=
        (forces[i][1] +
          (p.temperature - 0.5) * 0.2 * c.rise -
          p.vy * (0.65 + c.viscosity * 0.8)) *
        dt;
      p.vx = clamp(p.vx, -0.08, 0.08);
      p.vy = clamp(p.vy, -0.13, 0.13);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const radius = Math.sqrt(p.mass / Math.PI) * 0.68,
        low = radius * 0.55,
        high = 2.4 - radius * 0.9;
      if (p.y < low) {
        p.y = low;
        p.vy = Math.max(0, p.vy) * 0.2;
      }
      if (p.y > high) {
        p.y = high;
        p.vy = Math.min(0, p.vy) * 0.2;
      }
      p.strain +=
        (Math.min(1, Math.abs(forces[i][1]) * 20) * c.split - p.strain) *
        dt *
        1.5;
    }
    this.shape();
  }
  advance(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    this.accumulator += Math.min(0.1, seconds) * this.config.speed;
    const dt = 1 / 120;
    while (this.accumulator >= dt) {
      this.step(dt);
      this.accumulator -= dt;
    }
  }
  snapshot() {
    return {
      time: this.time,
      parcels: this.parcels.length,
      mass: this.parcels.reduce((s, p) => s + p.mass, 0),
      warm:
        this.parcels.reduce((s, p) => s + p.temperature, 0) /
        Math.max(1, this.parcels.length),
      rising: this.parcels.filter((p) => p.vy > 0).length,
      falling: this.parcels.filter((p) => p.vy < 0).length,
    };
  }
}
