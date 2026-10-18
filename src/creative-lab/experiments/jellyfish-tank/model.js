/** Original, DOM-free pulsed swimmers and trailing constrained filament chains. */
export const DEFAULTS = Object.freeze({
  mode: "disturb",
  count: 12,
  minSize: 0.55,
  maxSize: 1.15,
  pulseSpeed: 0.8,
  driftSpeed: 0.7,
  tentacleLength: 1,
  glow: 1,
  particles: 100,
  lightColor: "#a1e6f5",
  darkness: 0.94,
  interaction: 0.8,
  species: "mixed",
  palette: "abyss",
  zoom: 1,
  quality: "balanced",
  view: "tank",
});
export const PALETTES = {
  abyss: {
    name: "Cobalt aquarium light",
    colors: ["#a6caff", "#b5dbff", "#aabaff"],
    tip: "#edf6ff",
    water: "#0648e8",
    light: "#a1e6f5",
  },
  orchid: {
    name: "Violet / pink",
    colors: ["#ad83ca", "#c890b0", "#8a8fd0"],
    tip: "#ffe2f4",
    water: "#391777",
    light: "#e6baf3",
  },
  moon: {
    name: "Moonlit pearl",
    colors: ["#a7c0ce", "#c1d0ca", "#92b5ca"],
    tip: "#f0f8e9",
    water: "#153775",
    light: "#e0f1ed",
  },
  tropical: {
    name: "Tropical neon",
    colors: ["#62c4ae", "#b5bf74", "#c785ac"],
    tip: "#e5ffce",
    water: "#075862",
    light: "#b4f1d0",
  },
  graphite: {
    name: "Graphite / white",
    colors: ["#89918c", "#c0c3b9", "#8e989a"],
    tip: "#eeece0",
    water: "#1c2424",
    light: "#e8e7df",
  },
};
export const SPECIES = {
  moon: {
    name: "Moon form",
    width: 1.12,
    height: 0.57,
    tentacles: 8,
    length: 0.9,
    period: 4.8,
    arms: 4,
  },
  lantern: {
    name: "Lantern form",
    width: 0.8,
    height: 1.05,
    tentacles: 8,
    length: 1.25,
    period: 3.6,
    arms: 3,
  },
  ribbon: {
    name: "Ribbon form",
    width: 1,
    height: 0.74,
    tentacles: 10,
    length: 1.05,
    period: 4.2,
    arms: 5,
  },
};
export const RANGES = [
  ["count", "Jellyfish count", 2, 16, 1],
  ["minSize", "Smallest bell", 0.4, 1.4, 0.05],
  ["maxSize", "Largest bell", 0.4, 1.8, 0.05],
  ["pulseSpeed", "Bell pulse speed", 0.25, 2, 0.05],
  ["driftSpeed", "Drift speed", 0.25, 2, 0.05],
  ["tentacleLength", "Tentacle length", 0.4, 1.8, 0.05],
  ["glow", "Internal glow", 0, 2, 0.05],
  ["particles", "Suspended particles", 0, 250, 10],
  ["darkness", "Water darkness", 0.5, 1, 0.01],
  ["interaction", "Interaction strength", 0, 2, 0.05],
  ["zoom", "Camera zoom", 0.7, 1.8, 0.05],
];
export const PRESETS = {
  midnight: { name: "01 · Cobalt, behind glass", settings: { ...DEFAULTS } },
  orchid: {
    name: "02 · Violet afterglow",
    settings: {
      ...DEFAULTS,
      palette: "orchid",
      lightColor: PALETTES.orchid.light,
      species: "ribbon",
      count: 6,
      glow: 1.3,
    },
  },
  moon: {
    name: "03 · A room full of moons",
    settings: {
      ...DEFAULTS,
      palette: "moon",
      lightColor: PALETTES.moon.light,
      species: "moon",
      count: 5,
      minSize: 1,
      maxSize: 1.5,
      pulseSpeed: 0.6,
      particles: 60,
    },
  },
  reef: {
    name: "04 · An unfamiliar reef",
    settings: {
      ...DEFAULTS,
      palette: "tropical",
      lightColor: PALETTES.tropical.light,
      mode: "light",
      species: "lantern",
      count: 10,
      glow: 1.2,
    },
  },
  graphite: {
    name: "05 · White ink, deep water",
    settings: {
      ...DEFAULTS,
      palette: "graphite",
      lightColor: PALETTES.graphite.light,
      glow: 0.25,
      particles: 30,
      darkness: 0.98,
    },
  },
  quiet: {
    name: "06 · A little less, a little slower",
    settings: {
      ...DEFAULTS,
      count: 5,
      quality: "economy",
      view: "open",
      pulseSpeed: 0.5,
      driftSpeed: 0.5,
      particles: 40,
    },
  },
};
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
  c.maxSize = Math.max(c.minSize, c.maxSize);
  for (const [k, allowed] of [
    ["mode", ["ambient", "light", "disturb"]],
    ["palette", Object.keys(PALETTES)],
    ["species", ["mixed", ...Object.keys(SPECIES)]],
    ["quality", ["economy", "balanced", "fine"]],
    ["view", ["tank", "open"]],
  ])
    if (allowed.includes(input[k])) c[k] = input[k];
  if (/^#[0-9a-f]{6}$/i.test(input.lightColor || ""))
    c.lightColor = input.lightColor;
  return c;
}
/** A short contraction, followed by a long recovery; derivative drives the swimming impulse. */
export function pulse(phase) {
  const p = ((phase % 1) + 1) % 1;
  // C2 easing: both velocity and acceleration settle at each end of the breath.
  const ease = (u) => u * u * u * (u * (u * 6 - 15) + 10);
  const slope = (u) => 30 * u * u * (u - 1) * (u - 1);
  if (p < 0.28) {
    const u = p / 0.28;
    return {
      amount: ease(u),
      derivative: slope(u) / 0.28,
    };
  }
  const u = (p - 0.28) / 0.72;
  return {
    amount: 1 - ease(u),
    derivative: -slope(u) / 0.72,
  };
}
export function bellShape(j) {
  const s = SPECIES[j.species];
  return {
    width: j.radius * s.width * (1 - j.contraction * 0.16),
    height: j.radius * s.height * (1 + j.contraction * 0.16),
    skirt: 1 - j.contraction * 0.4,
  };
}
export function attachment(j, chain) {
  const b = bellShape(j),
    s = SPECIES[j.species],
    x = Math.cos(chain.angle) * b.width * (chain.arm ? 0.27 : 0.96),
    // The rim and the roots use the same projected hemisphere as the membrane.
    sy = (b.height * s.width) / s.height,
    y =
      (-Math.sin(chain.angle) * Math.sin(j.tilt) * (chain.arm ? 0.27 : 0.96) -
        (chain.arm ? (s.height / s.width) * 0.15 * Math.cos(j.tilt) : 0)) *
      sy;
  return {
    x: j.x + x * Math.cos(j.angle) - y * Math.sin(j.angle),
    y: j.y + x * Math.sin(j.angle) + y * Math.cos(j.angle),
  };
}
const POSE_FIELDS = [
  "x",
  "y",
  "angle",
  "tilt",
  "phase",
  "contraction",
  "response",
];
export class JellyfishScene {
  constructor(settings = {}, aspect = 1.25) {
    this.config = options(settings);
    this.aspect = aspect;
    this.reset();
  }
  reset() {
    this.time = 0;
    this.accumulator = 0;
    this.pointer = { x: 0.5, y: 0.5, amount: 0, pressed: false };
    this.wakes = [];
    this.currents = [];
    this.lastWake = -10;
    this.build();
  }
  build() {
    const c = this.config,
      nodes = { economy: 14, balanced: 24, fine: 32 }[c.quality];
    this.jellies = Array.from({ length: c.count }, (_, id) => {
      const species =
          c.species === "mixed"
            ? [
                "moon",
                "moon",
                "ribbon",
                "moon",
                "lantern",
                "moon",
                "moon",
                "moon",
              ][id % 8]
            : c.species,
        s = SPECIES[species],
        scale = c.minSize + (c.maxSize - c.minSize) * hash(id + 20),
        depth = 0.58 + hash(id + 300) * 0.42,
        position = [
          [0.29, 0.3],
          [0.7, 0.48],
          [0.18, 0.59],
          [0.61, 0.22],
          [0.49, 0.65],
          [0.83, 0.72],
          [0.14, 0.23],
          [0.67, 0.83],
          [0.83, 0.18],
          [0.38, 0.47],
          [0.29, 0.82],
          [0.83, 0.37],
        ][id],
        x =
          (position ? position[0] : 0.12 + hash(id + 680) * 0.76) * this.aspect,
        y = position ? position[1] : 0.18 + hash(id + 900) * 0.62,
        phase = hash(id + 70),
        j = {
          id,
          species,
          scale,
          depth,
          radius: 0.105 * scale * depth,
          x,
          y,
          homeX: x,
          homeY: y,
          vx: 0,
          vy: 0,
          angle: (hash(id + 70) - 0.5) * 2.3,
          heading: (hash(id + 70) - 0.5) * 2.3,
          tilt: [0.22, 0.96, 0.34, 0.16, 0.3, 0.61, 0.38, 1.05][id % 8],
          baseTilt: [0.22, 0.96, 0.34, 0.16, 0.3, 0.61, 0.38, 1.05][id % 8],
          tapAt: -10,
          phase,
          contraction: pulse(phase).amount,
          thrust: 0,
          response: 0,
          chains: [],
        };
      const count = Math.round(
        s.tentacles * (c.quality === "economy" ? 0.65 : 1),
      );
      for (let i = 0; i < count + s.arms; i++) {
        const arm = i >= count,
          seed = id * 101 + i,
          angle = (i / (arm ? s.arms : count)) * Math.PI * 2,
          length =
            j.radius *
            (arm
              ? species === "moon"
                ? 0.72
                : 1.35
              : species === "moon"
                ? 0.22
                : 0.6) *
            s.length *
            c.tentacleLength *
            (0.65 + hash(seed + 80) * 0.55),
          chain = {
            arm,
            angle,
            length,
            seed,
            rest: length / (nodes - 1),
            points: new Float32Array(nodes * 2),
            previous: new Float32Array(nodes * 2),
          };
        const anchor = attachment(j, chain);
        for (let k = 0; k < nodes; k++) {
          const u = k / (nodes - 1);
          chain.points[k * 2] =
            anchor.x +
            -Math.sin(j.angle) * length * u * 0.55 +
            (Math.sin(u * 5 + seed) * 0.045 +
              Math.sin(u * 9 + seed * 0.3) * 0.012) *
              u *
              Math.min(1, length * 8);
          chain.points[k * 2 + 1] =
            anchor.y + Math.cos(j.angle * 0.55) * length * u;
        }
        chain.previous.set(chain.points);
        j.chains.push(chain);
      }
      return j;
    }).sort((a, b) => a.depth - b.depth);
    const copyPose = (j) => ({
      ...j,
      chains: j.chains.map((chain) => ({
        ...chain,
        points: chain.points.slice(),
      })),
    });
    this.previousPose = this.jellies.map(copyPose);
    this.view = {
      time: this.time,
      jellies: this.jellies.map(copyPose),
      pointer: this.pointer,
      wakes: this.wakes,
      currents: this.currents,
      worldPoint: () => this.worldPoint(),
    };
  }
  update(settings) {
    const old = this.config;
    this.config = options(settings);
    if (
      [
        "count",
        "minSize",
        "maxSize",
        "species",
        "quality",
        "tentacleLength",
      ].some((k) => old[k] !== this.config[k])
    )
      this.build();
  }
  resize(aspect) {
    aspect = clamp(aspect, 0.25, 8);
    const ratio = aspect / this.aspect;
    for (let index = 0; index < this.jellies.length; index++) {
      const j = this.jellies[index],
        previous = this.previousPose[index];
      const dx = j.x * (ratio - 1);
      j.x += dx;
      previous.x += dx;
      j.homeX *= ratio;
      for (const c of j.chains)
        for (let i = 0; i < c.points.length; i += 2) {
          c.points[i] += dx;
          c.previous[i] += dx;
        }
      for (const chain of previous.chains)
        for (let i = 0; i < chain.points.length; i += 2) chain.points[i] += dx;
    }
    for (const source of [...this.currents, ...this.wakes]) source.x *= ratio;
    this.aspect = aspect;
  }
  worldPoint() {
    const q = this.pointer,
      z = this.config.zoom;
    return {
      x: this.aspect * (0.5 + (q.x - 0.5) / z),
      y: 0.5 + (q.y - 0.5) / z,
    };
  }
  /** Normalized pointer input. Drag velocity creates bounded, decaying water-current samples. */
  point(x, y, pressed = false) {
    const last = this.pointer,
      before = this.worldPoint(),
      elapsed = clamp(this.time - (last.time ?? this.time), 1 / 60, 0.15);
    this.pointer = {
      x: clamp(x, 0, 1),
      y: clamp(y, 0, 1),
      amount: 1,
      pressed,
      time: this.time,
    };
    const q = this.worldPoint(),
      dx = q.x - before.x,
      dy = q.y - before.y;
    if (this.config.mode === "ambient") return;
    if (pressed && !last.pressed) {
      this.tap(x, y);
      if (this.config.mode === "disturb") this.disturb(x, y);
    }
    if (
      this.config.mode === "disturb" &&
      last.amount &&
      Math.hypot(dx, dy) > 0.001
    ) {
      const speed = Math.hypot(dx, dy) / elapsed,
        scale = Math.min(1.2, speed) / Math.max(0.0001, speed),
        force = pressed ? 1 : 0.24;
      this.currents.push({
        x: q.x,
        y: q.y,
        vx: (dx / elapsed) * scale * force,
        vy: (dy / elapsed) * scale * force,
        time: this.time,
      });
      if (this.currents.length > 20) this.currents.shift();
    }
  }
  /** Tap a nearby bell to start one smooth extra contraction; no teleport or phase jump. */
  tap(x = this.pointer.x, y = this.pointer.y) {
    if (this.config.mode === "ambient" || !this.config.interaction) return -1;
    const z = this.config.zoom,
      wx = this.aspect * (0.5 + (x - 0.5) / z),
      wy = 0.5 + (y - 0.5) / z;
    let chosen = null,
      best = Infinity;
    for (const j of this.jellies) {
      const d = Math.hypot(wx - j.x, wy - j.y) / j.radius;
      if (d < 1.8 && d < best && this.time - j.tapAt > 0.4) {
        chosen = j;
        best = d;
      }
    }
    if (!chosen) return -1;
    chosen.tapAt = this.time;
    return chosen.id;
  }
  disturb(x = this.pointer.x, y = this.pointer.y) {
    const z = this.config.zoom;
    this.wakes.push({
      x: this.aspect * (0.5 + (x - 0.5) / z),
      y: 0.5 + (y - 0.5) / z,
      time: this.time,
    });
    if (this.wakes.length > 12) this.wakes.shift();
    this.lastWake = this.time;
  }
  release() {
    this.pointer.amount = 0;
    this.pointer.pressed = false;
  }
  settleInput() {
    /* A paused scene keeps its exact pose; only the inspection light moves. */
  }
  step(dt) {
    for (let i = 0; i < this.jellies.length; i++) {
      const j = this.jellies[i],
        previous = this.previousPose[i];
      for (const key of POSE_FIELDS) previous[key] = j[key];
      j.chains.forEach((chain, k) =>
        previous.chains[k].points.set(chain.points),
      );
    }
    this.time += dt;
    this.wakes = this.wakes.filter((w) => this.time - w.time < 3.5);
    this.currents = this.currents.filter((w) => this.time - w.time < 2.2);
    const c = this.config,
      t = this.time,
      q = this.worldPoint();
    for (const j of this.jellies) {
      const s = SPECIES[j.species],
        rate = c.pulseSpeed / (s.period * Math.sqrt(j.scale)),
        dx = q.x - j.x,
        dy = q.y - j.y,
        d = Math.hypot(dx, dy),
        fall = Math.max(0, 1 - d / 0.38) ** 2 * this.pointer.amount;
      let fx = 0,
        fy = 0,
        response = 0;
      if (c.mode === "light") {
        fx = dx * fall * 0.22 * c.interaction;
        fy = dy * fall * 0.22 * c.interaction;
        response = fall * c.interaction;
      }
      if (c.mode === "disturb") {
        response = fall * 0.45 * c.interaction;
        for (const flow of this.currents) {
          const d = Math.hypot(j.x - flow.x, j.y - flow.y),
            weight =
              Math.max(0, 1 - d / 0.34) ** 2 *
              Math.exp(-(t - flow.time) * 2.5) *
              c.interaction;
          fx += flow.vx * weight * 0.1;
          fy += flow.vy * weight * 0.1;
          response += weight * Math.hypot(flow.vx, flow.vy) * 0.3;
        }
        for (const w of this.wakes) {
          const age = t - w.time,
            wx = j.x - w.x,
            wy = j.y - w.y,
            dist = Math.hypot(wx, wy),
            envelope =
              Math.exp(-(((dist - age * 0.13) / 0.13) ** 2)) *
              Math.exp(-age * 1.2) *
              c.interaction,
            k = 1 / Math.max(0.025, dist);
          fx += wx * k * envelope * 0.065;
          fy += wy * k * envelope * 0.065;
          response += envelope * 0.8;
        }
      }
      j.response = Math.min(1, response);
      j.phase += dt * rate * (1 + j.response * 0.3);
      const p = pulse(j.phase),
        age = t - j.tapAt,
        touch = age < 1.8 ? pulse(age / 1.8) : { amount: 0, derivative: 0 },
        squeeze = touch.amount * Math.min(0.85, c.interaction * 0.75);
      j.contraction = 1 - (1 - p.amount) * (1 - squeeze);
      j.response = Math.max(j.response, squeeze);
      // Integrate the actual contraction derivative. Recovery creates no forward thrust.
      j.thrust =
        (Math.max(0, p.derivative) * rate * 0.019 +
          (Math.max(0, touch.derivative) / 1.8) * 0.024 * c.interaction) /
        Math.sqrt(j.scale);
      const heading =
        j.heading +
        Math.sin(t * 0.19 + j.id * 2.1) * 0.28 +
        Math.sin(t * 0.07 + j.id) * 0.08 +
        (c.mode === "light"
          ? dx * fall * 1.8 * c.interaction
          : clamp(fx * 5, -0.45, 0.45));
      j.angle += (heading - j.angle) * (1 - Math.exp(-dt * 0.9));
      const tilt =
        j.baseTilt +
        Math.sin(t * 0.16 + j.id * 1.7) * 0.12 +
        clamp(fx * 2, -0.18, 0.18);
      j.tilt += (tilt - j.tilt) * (1 - Math.exp(-dt * 1.6));
      const drift = c.driftSpeed,
        returnCurrent = (0.019 * rate) / Math.sqrt(j.scale),
        ax =
          Math.sin(j.angle) * j.thrust +
          (Math.sin(t * 0.14 + j.id * 2.3) * 0.0014 + (j.homeX - j.x) * 0.012) *
            drift +
          fx,
        ay =
          -Math.cos(j.angle) * j.thrust +
          returnCurrent +
          (j.homeY - j.y) * 0.012 * drift +
          Math.sin(t * 0.11 + j.id) * 0.001 * drift +
          fy;
      j.vx = (j.vx + ax * dt) * Math.exp(-dt * 0.75);
      j.vy = (j.vy + ay * dt) * Math.exp(-dt * 0.75);
      j.x += j.vx * dt * drift;
      j.y += j.vy * dt * drift;
      // Soft boundaries protect oversized configurations without discontinuous wrapping.
      j.x = clamp(j.x, -0.1, this.aspect + 0.1);
      j.y = clamp(j.y, -0.12, 1.08);
      for (const chain of j.chains) {
        const a = chain.points,
          old = chain.previous,
          anchor = attachment(j, chain),
          drag = Math.exp(-dt * (chain.arm ? 3.4 : 2.2));
        a[0] = anchor.x;
        a[1] = anchor.y;
        old[0] = anchor.x;
        old[1] = anchor.y;
        for (let i = 2; i < a.length; i += 2) {
          const x = a[i],
            y = a[i + 1],
            u = i / (a.length - 2),
            flow =
              Math.sin(t * 0.53 + chain.seed * 0.4 - u * 4) * 0.022 +
              Math.sin(t * 0.29 + y * 5 + j.id) * 0.018;
          a[i] = x + (x - old[i]) * drag + (flow + fx * 1.2) * dt * dt;
          a[i + 1] =
            y +
            (y - old[i + 1]) * drag +
            (0.018 +
              fy * 1.2 +
              Math.sin(t * 0.4 + u * 6 + chain.seed) * 0.007) *
              dt *
              dt;
          old[i] = x;
          old[i + 1] = y;
        }
        for (let pass = 0; pass < 3; pass++) {
          a[0] = anchor.x;
          a[1] = anchor.y;
          for (let i = 2; i < a.length; i += 2) {
            const x = a[i] - a[i - 2],
              y = a[i + 1] - a[i - 1],
              dist = Math.max(0.000001, Math.hypot(x, y)),
              correction = (dist - chain.rest) / dist,
              k = i === 2 ? 1 : 0.5;
            a[i] -= x * correction * k;
            a[i + 1] -= y * correction * k;
            if (i > 2) {
              a[i - 2] += x * correction * 0.5;
              a[i - 1] += y * correction * 0.5;
            }
          }
        }
      }
    }
  }
  advance(dt) {
    this.accumulator += clamp(dt, 0, 0.1);
    while (this.accumulator >= 1 / 120) {
      this.step(1 / 120);
      this.accumulator -= 1 / 120;
    }
  }
  /** Smooth display between fixed physics steps, with reusable buffers and one-step latency. */
  renderState() {
    const mix = clamp(this.accumulator * 120, 0, 1);
    for (let i = 0; i < this.jellies.length; i++) {
      const now = this.jellies[i],
        before = this.previousPose[i],
        draw = this.view.jellies[i];
      for (const key of POSE_FIELDS)
        draw[key] = before[key] + (now[key] - before[key]) * mix;
      now.chains.forEach((chain, k) => {
        const prior = before.chains[k].points,
          points = draw.chains[k].points;
        for (let n = 0; n < points.length; n++)
          points[n] = prior[n] + (chain.points[n] - prior[n]) * mix;
      });
    }
    this.view.time = Math.max(0, this.time - 1 / 120 + this.accumulator);
    this.view.pointer = this.pointer;
    this.view.wakes = this.wakes;
    this.view.currents = this.currents;
    return this.view;
  }
  snapshot() {
    return {
      time: this.time,
      count: this.jellies.length,
      filaments: this.jellies.reduce((n, j) => n + j.chains.length, 0),
      wakes: this.wakes.length,
      currents: this.currents.length,
      reacting: this.jellies.filter((j) => j.response > 0.05).length,
      contact: { ...this.pointer },
      contractions: this.jellies.map((j) => j.contraction),
    };
  }
  dispose() {
    this.jellies = [];
    this.previousPose = [];
    this.view.jellies = [];
    this.view.wakes = [];
    this.view.currents = [];
    this.currents = [];
    this.wakes = [];
  }
}
