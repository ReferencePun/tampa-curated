/** DOM-free, seeded radial colonies with fixed-step damped springs. */
export const DEFAULTS = Object.freeze({
  mode: "attract",
  density: 64,
  tendrils: 30,
  length: 1,
  softness: 1,
  sway: 0.65,
  radius: 0.24,
  attraction: 1,
  avoidance: 1,
  ripple: 0.8,
  palette: "lagoon",
  glow: 0.65,
  background: "#071b20",
  damping: 1,
  speed: 0.7,
  material: "translucent",
  transparent: false,
});
export const PALETTES = {
  coral: {
    name: "Coral / cream",
    colors: ["#dd998a", "#ebbd9d", "#a47973", "#f4d7b5"],
    tip: "#fff3d9",
    background: "#292623",
  },
  lagoon: {
    name: "Teal / blue",
    colors: ["#459a9e", "#568bac", "#6ab7a8", "#777eaa"],
    tip: "#caf5d9",
    background: "#071b20",
  },
  lilac: {
    name: "Pink / lilac",
    colors: ["#b67fa9", "#9985bb", "#d893ac", "#867bac"],
    tip: "#ffe0ee",
    background: "#201726",
  },
  graphite: {
    name: "Graphite",
    colors: ["#6c6b64", "#8c877b", "#9e978a", "#5f655f"],
    tip: "#d2ccba",
    background: "#e6dfce",
  },
  alien: {
    name: "Alien neon",
    colors: ["#c5d75c", "#67bfa7", "#bf7fae", "#619fbd"],
    tip: "#f1fcb5",
    background: "#101b21",
  },
};
export const PRESETS = {
  lagoon: { name: "01 · A garden after dark", settings: { ...DEFAULTS } },
  coral: {
    name: "02 · The shallows",
    settings: {
      ...DEFAULTS,
      palette: "coral",
      background: PALETTES.coral.background,
      mode: "avoid",
      material: "satin",
      glow: 0.2,
      length: 1.1,
      speed: 0.5,
    },
  },
  lilac: {
    name: "03 · A passing current",
    settings: {
      ...DEFAULTS,
      palette: "lilac",
      background: PALETTES.lilac.background,
      mode: "ripple",
      ripple: 1.4,
      glow: 1,
      softness: 1.3,
    },
  },
  graphite: {
    name: "04 · Specimens in graphite",
    settings: {
      ...DEFAULTS,
      palette: "graphite",
      background: PALETTES.graphite.background,
      material: "ink",
      glow: 0,
      density: 42,
      tendrils: 24,
      length: 0.9,
    },
  },
  alien: {
    name: "05 · Other waters",
    settings: {
      ...DEFAULTS,
      palette: "alien",
      background: PALETTES.alien.background,
      mode: "mixed",
      attraction: 0.9,
      avoidance: 0.6,
      ripple: 1.2,
      glow: 1,
      tendrils: 38,
    },
  },
  quiet: {
    name: "06 · A very small tide",
    settings: {
      ...DEFAULTS,
      mode: "mixed",
      attraction: 0.4,
      avoidance: 0.3,
      ripple: 0.4,
      speed: 0.35,
      sway: 0.35,
      density: 88,
      tendrils: 20,
      glow: 0.3,
    },
  },
};
export const RANGES = [
  ["density", "Anemone density", 16, 140, 2],
  ["tendrils", "Tendrils per crown", 12, 48, 2],
  ["length", "Tendril length", 0.5, 1.6, 0.05],
  ["softness", "Softness / flexibility", 0.3, 2, 0.05],
  ["sway", "Idle sway", 0, 1.5, 0.05],
  ["radius", "Pointer radius", 0.08, 0.5, 0.01],
  ["attraction", "Attraction strength", 0, 2, 0.05],
  ["avoidance", "Recoil strength", 0, 2, 0.05],
  ["ripple", "Ripple strength", 0, 2, 0.05],
  ["glow", "Luminous diffusion", 0, 1.5, 0.05],
  ["damping", "Movement damping", 0.3, 2, 0.05],
  ["speed", "Motion speed", 0.2, 2, 0.05],
];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export function options(input = {}) {
  const c = { ...DEFAULTS };
  for (const [k, , a, b, step] of RANGES) {
    const v = Number(input[k]);
    if (Number.isFinite(v))
      c[k] = Number(
        (a + Math.round((clamp(v, a, b) - a) / step) * step).toFixed(4),
      );
  }
  for (const [k, allowed] of [
    ["mode", ["attract", "avoid", "ripple", "mixed"]],
    ["material", ["translucent", "satin", "ink"]],
    ["palette", Object.keys(PALETTES)],
  ])
    if (allowed.includes(input[k])) c[k] = input[k];
  if (/^#[0-9a-f]{6}$/i.test(input.background || ""))
    c.background = input.background;
  if (typeof input.transparent === "boolean") c.transparent = input.transparent;
  return c;
}
/** Ring pulse has finite support, propagation speed and lifetime; no screen-wide sine wave. */
export function pulseAt(p, x, y, time, radius = 0.24) {
  const age = time - p.time,
    d = Math.hypot(x - p.x, y - p.y);
  if (age < 0 || age > 3 || d > Math.min(0.85, radius * 3)) return 0;
  const q = (d - age * radius) / Math.max(0.02, radius * 0.23);
  if (Math.abs(q) > 3) return 0;
  return Math.cos(q * 1.5) * Math.exp(-q * q) * Math.exp(-age * 1.25) * p.power;
}
export class AnemoneField {
  constructor(settings = {}, aspect = 1.35) {
    this.config = options(settings);
    this.aspect = aspect;
    this.reset();
  }
  reset() {
    this.time = 0;
    this.accumulator = 0;
    this.pulses = [];
    this.pointer = { x: 0.5, y: 0.5, amount: 0, pressed: false };
    this.lastPulse = -10;
    this.build();
    this.geometry();
  }
  build() {
    const c = this.config,
      n = c.density;
    // Golden-angle distribution breaks rows while keeping the whole substrate populated.
    this.colonies = Array.from({ length: n }, (_, i) => {
      const col = (i * 0.618033988749895) % 1;
      return {
        x: 0.035 + col * 0.93,
        y: 0.055 + ((i + 0.3 + hash(i + 9) * 0.4) / n) * 0.94,
        size: (0.78 + hash(i + 40) * 0.5) * Math.sqrt(64 / n),
        phase: hash(i + 90) * Math.PI * 2,
        color: Math.floor(hash(i + 170) * 4),
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0,
        curl: 0,
        vc: 0,
        response: 0,
        id: i,
      };
    });
    this.paths = [];
    for (const root of this.colonies)
      for (let j = 0; j < c.tendrils; j++) {
        const seed = root.id * 73 + j,
          ring = j % 3,
          a = j * 2.399963229728653 + root.phase;
        this.paths.push({
          root,
          angle: a,
          ring,
          phase: hash(seed + 800) * 6.28,
          scale: 0.72 + hash(seed + 1800) * 0.4,
          bend: (hash(seed + 4800) - 0.5) * 0.7,
          color: (root.color + (hash(seed + 281) > 0.8 ? 1 : 0)) % 4,
          front: Math.sin(a) > 0 ? 1 : 0,
          points: new Float32Array(18),
        });
      }
    // Back tentacles, bodies, and front tentacles are drawn in separate passes.
    this.paths.sort((a, b) => a.root.y - b.root.y);
  }
  update(settings) {
    const before = this.config;
    this.config = options(settings);
    if (
      before.density !== this.config.density ||
      before.tendrils !== this.config.tendrils
    )
      this.build();
    this.geometry();
  }
  resize(aspect) {
    this.aspect = clamp(aspect, 0.2, 8);
    this.geometry();
  }
  point(x, y, pressed = false) {
    const prev = this.pointer,
      d = Math.hypot((x - prev.x) * this.aspect, y - prev.y);
    this.pointer = {
      x: clamp(x, -0.2, 1.2),
      y: clamp(y, -0.2, 1.2),
      amount: 1,
      pressed,
    };
    if (
      (d > 0.018 || prev.amount === 0 || (pressed && !prev.pressed)) &&
      this.time - this.lastPulse > 0.075
    ) {
      this.pulses.push({
        x: x * this.aspect,
        y,
        time: this.time,
        power: clamp(0.45 + d * 8 + (pressed ? 0.3 : 0), 0.4, 1.5),
      });
      if (this.pulses.length > 24) this.pulses.shift();
      this.lastPulse = this.time;
    }
  }
  release() {
    this.pointer.amount = 0;
    this.pointer.pressed = false;
  }
  forces(root) {
    const c = this.config,
      q = this.pointer,
      dx = (q.x - root.x) * this.aspect,
      dy = q.y - root.y,
      d = Math.hypot(dx, dy),
      fall = Math.max(0, 1 - d / c.radius) ** 2 * q.amount,
      unit = 1 / Math.max(0.018, d),
      reach = c.mode === "attract" || c.mode === "mixed" ? c.attraction : 0,
      recoil = c.mode === "avoid" || c.mode === "mixed" ? c.avoidance : 0,
      // A mixed crown reaches from afar and contracts near the fingertip.
      push =
        recoil *
        (c.mode === "mixed" ? Math.max(0, 1 - d / (c.radius * 0.55)) * 1.8 : 1),
      force =
        (reach - push) * fall * (q.pressed ? 1.25 : 1) * 0.095 * c.softness;
    let px = dx * unit * force,
      py = dy * unit * force,
      curl = push * fall * 0.75;
    if (c.mode === "ripple" || c.mode === "mixed")
      for (const p of this.pulses) {
        const wave =
            pulseAt(p, root.x * this.aspect, root.y, this.time, c.radius) *
            c.ripple,
          vx = root.x * this.aspect - p.x,
          vy = root.y - p.y,
          k = 1 / Math.max(0.025, Math.hypot(vx, vy));
        px += vx * k * wave * 0.035;
        py += vy * k * wave * 0.035;
        curl += wave * 0.35;
      }
    return { x: px, y: py, curl: clamp(curl, -0.65, 1), response: fall };
  }
  step(dt) {
    this.time += dt;
    this.pulses = this.pulses.filter((p) => this.time - p.time < 3);
    const c = this.config,
      k = 42 / c.softness,
      drag = Math.exp(-(4 + c.damping * 6) * dt);
    for (const r of this.colonies) {
      const f = this.forces(r);
      r.vx = (r.vx + (f.x - r.dx) * k * dt) * drag;
      r.vy = (r.vy + (f.y - r.dy) * k * dt) * drag;
      r.vc = (r.vc + (f.curl - r.curl) * k * dt) * drag;
      r.dx += r.vx * dt;
      r.dy += r.vy * dt;
      r.curl += r.vc * dt;
      r.response = f.response;
    }
  }
  advance(dt) {
    this.accumulator += clamp(dt, 0, 0.1) * this.config.speed;
    while (this.accumulator >= 1 / 120) {
      this.step(1 / 120);
      this.accumulator -= 1 / 120;
    }
    this.geometry();
  }
  settleInput() {
    // Still-image interaction: update the shape without advancing the animation clock.
    for (const r of this.colonies) {
      const f = this.forces(r);
      r.dx = f.x;
      r.dy = f.y;
      r.curl = f.curl;
      r.vx = r.vy = r.vc = 0;
      r.response = f.response;
    }
    this.geometry();
  }
  geometry() {
    const c = this.config,
      t = this.time,
      aspect = this.aspect;
    for (const p of this.paths) {
      const r = p.root,
        L = 0.09 * r.size * c.length * p.scale * (1 - p.ring * 0.14),
        a = p.angle,
        sway =
          c.sway *
          (Math.sin(t * 0.8 + p.phase) + 0.4 * Math.sin(t * 1.23 + r.phase)) *
          0.12,
        bend = p.bend + sway,
        contraction = 1 - r.curl * 0.46;
      for (let i = 0; i < 9; i++) {
        const u = i / 8,
          ease = u * u * (3 - 2 * u),
          radius = L * (0.19 + Math.sin(u * 1.4) * contraction),
          theta =
            a +
            bend * u * 1.8 +
            Math.sin(t * 0.68 + p.phase + u * 2) * c.sway * 0.06 * u,
          height =
            L *
            (0.25 +
              (Math.sin(u * 2.3) * (0.23 + p.ring * 0.06) + u * 0.04) *
                (1 - r.curl * 0.35)),
          curlTip = Math.max(0, u - 0.64) ** 2 * L * 1.8;
        p.points[i * 2] =
          r.x * aspect +
          Math.cos(theta) * (radius - curlTip) +
          r.dx * ease * (0.8 + 0.2 * Math.sin(a));
        p.points[i * 2 + 1] =
          r.y + Math.sin(theta) * radius * 0.82 - height + r.dy * ease;
      }
    }
  }
  snapshot() {
    return {
      time: this.time,
      colonies: this.colonies.length,
      tendrils: this.paths.length,
      pulses: this.pulses.length,
      contact: { ...this.pointer },
    };
  }
  dispose() {
    this.paths = [];
    this.colonies = [];
    this.pulses = [];
  }
}
