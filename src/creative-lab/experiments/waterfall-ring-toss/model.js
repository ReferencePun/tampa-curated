/** DOM-independent, fixed-step water toy. Coordinates: 800 × 500, y downward. */
export const WIDTH = 800,
  HEIGHT = 500,
  STEP = 1 / 120;
export const COLORS = [
  "#e46242",
  "#eeb83f",
  "#429789",
  "#697ab8",
  "#e89f9e",
  "#edf0d5",
];
export const DEFAULTS = Object.freeze({
  mode: "classic",
  strength: 1,
  buoyancy: 1,
  ringCount: 10,
  layout: "duet",
  shape: "rounded",
  turbulence: 0.45,
  world: "harbor",
  timer: 60,
  freePlay: false,
});
export const PRESETS = {
  harbor: { name: "01 · A little tide", settings: { ...DEFAULTS } },
  reef: {
    name: "02 · Coral carnival",
    settings: {
      ...DEFAULTS,
      mode: "world",
      world: "reef",
      layout: "terraces",
      ringCount: 12,
      turbulence: 0.65,
    },
  },
  moon: {
    name: "03 · Moon pool",
    settings: {
      ...DEFAULTS,
      mode: "world",
      world: "moon",
      shape: "porthole",
      buoyancy: 0.6,
      turbulence: 0.2,
    },
  },
  challenge: {
    name: "04 · Four in a row",
    settings: {
      ...DEFAULTS,
      mode: "challenge",
      layout: "quartet",
      ringCount: 12,
      timer: 90,
    },
  },
  practice: {
    name: "05 · The long afternoon",
    settings: { ...DEFAULTS, mode: "endless", strength: 1.2, turbulence: 0.3 },
  },
};
export const LAYOUTS = {
  duet: [
    { x: 265, tip: 215, base: 341 },
    { x: 535, tip: 235, base: 361 },
  ],
  quartet: [
    { x: 170, tip: 260, base: 362 },
    { x: 325, tip: 185, base: 302 },
    { x: 480, tip: 185, base: 302 },
    { x: 635, tip: 260, base: 362 },
  ],
  terraces: [
    { x: 210, tip: 270, base: 367 },
    { x: 400, tip: 185, base: 310 },
    { x: 590, tip: 270, base: 367 },
  ],
  arch: [
    { x: 180, tip: 280, base: 385 },
    { x: 330, tip: 220, base: 333 },
    { x: 480, tip: 175, base: 302 },
    { x: 630, tip: 240, base: 353 },
  ],
};
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export function options(input = {}) {
  const o = { ...DEFAULTS, ...input };
  for (const [k, values] of Object.entries({
    mode: ["classic", "challenge", "world", "endless"],
    layout: Object.keys(LAYOUTS),
    shape: ["rounded", "porthole"],
    world: ["harbor", "reef", "moon"],
  }))
    if (!values.includes(o[k])) o[k] = DEFAULTS[k];
  for (const [k, a, b, step] of [
    ["strength", 0.4, 1.8, 0.05],
    ["buoyancy", 0.4, 1.6, 0.05],
    ["ringCount", 4, 24, 1],
    ["turbulence", 0, 1, 0.05],
    ["timer", 20, 180, 5],
  ])
    o[k] =
      Math.round(
        clamp(Number.isFinite(+o[k]) ? +o[k] : DEFAULTS[k], a, b) / step,
      ) * step;
  o.freePlay = !!o.freePlay;
  return Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, o[k]]));
}
function finite(n, label) {
  if (!Number.isFinite(n)) throw Error(`${label} must be finite.`);
  return n;
}
export function validateScene(scene = {}) {
  const chamber = {
    left: 24,
    right: 776,
    top: 16,
    bottom: 484,
    ...scene.chamber,
  };
  for (const k of ["left", "right", "top", "bottom"]) finite(chamber[k], k);
  if (
    chamber.left < 0 ||
    chamber.right > 800 ||
    chamber.top < 0 ||
    chamber.bottom > 500 ||
    chamber.right - chamber.left < 200 ||
    chamber.bottom - chamber.top < 200
  )
    throw Error("Chamber must fit the 800 × 500 coordinate system.");
  const pegs = scene.pegs?.map((p, i) => {
    for (const k of ["x", "tip", "base"]) finite(p[k], `Peg ${k}`);
    if (
      p.x < chamber.left + 30 ||
      p.x > chamber.right - 30 ||
      p.tip < chamber.top + 25 ||
      p.base > chamber.bottom - 25 ||
      p.base - p.tip < 50
    )
      throw Error("Pegs must fit inside the chamber.");
    return { ...p, id: String(p.id ?? i) };
  });
  if (pegs && new Set(pegs.map((p) => p.id)).size !== pegs.length)
    throw Error("Peg IDs must be unique.");
  if (pegs && (!pegs.length || pegs.length > 8))
    throw Error("Use one to eight pegs.");
  const pumps = (
    scene.pumps ?? [
      { x: 265, y: 454, spread: 305, drift: 0 },
      { x: 535, y: 454, spread: 305, drift: 0 },
    ]
  ).map((p) => {
    const pump = { spread: 300, drift: 0, ...p };
    for (const k of ["x", "y", "spread", "drift"]) finite(pump[k], `Pump ${k}`);
    if (
      pump.x < chamber.left ||
      pump.x > chamber.right ||
      pump.y < chamber.top ||
      pump.y > chamber.bottom ||
      pump.spread < 30 ||
      pump.spread > 800
    )
      throw Error("Invalid pump position or spread.");
    return pump;
  });
  if (!pumps.length || pumps.length > 4) throw Error("Use one to four pumps.");
  const rules = {
    captureTolerance: 12,
    stackSpacing: 7,
    points: 1,
    ...scene.scoring,
  };
  for (const k of Object.keys(rules)) finite(rules[k], `Scoring ${k}`);
  if (
    rules.captureTolerance < 1 ||
    rules.captureTolerance > 18 ||
    rules.stackSpacing < 4 ||
    rules.stackSpacing > 12 ||
    rules.points <= 0
  )
    throw Error("Invalid scoring rules.");
  const objects = scene.objects?.map((r, i) => {
    finite(r.x, "Ring x");
    finite(r.y, "Ring y");
    const radius = clamp(finite(r.radius ?? 17, "Ring radius"), 12, 22);
    if (
      r.x < chamber.left + radius ||
      r.x > chamber.right - radius ||
      r.y < chamber.top + 10 ||
      r.y > chamber.bottom - 10
    )
      throw Error("Ring lies outside the chamber.");
    return {
      x: r.x,
      y: r.y,
      radius,
      color: /^#[0-9a-f]{6}$/i.test(r.color)
        ? r.color
        : COLORS[i % COLORS.length],
    };
  });
  if (objects && (!objects.length || objects.length > 24))
    throw Error("Use one to 24 rings.");
  return { chamber, pegs, pumps, scoring: rules, objects };
}
export class WaterToy {
  constructor(settings = {}, scene = {}) {
    this.config = options(settings);
    this.scene = validateScene(scene);
    this.autoPumps = !scene.pumps;
    this.reset();
  }
  reset() {
    this.time = 0;
    this.accumulator = 0;
    this.bursts = [];
    this.bubbles = [];
    this.pumpCount = 0;
    this.total = 0;
    this.round = 1;
    this.roundWait = 0;
    this.challenge = "ready";
    this.remaining = this.config.timer;
    this.events = [];
    this.pegs = (this.scene.pegs ?? LAYOUTS[this.config.layout]).map(
      (p, i) => ({ ...p, id: String(p.id ?? i), count: 0 }),
    );
    if (this.autoPumps) {
      // Different molded boards put their nozzles beneath their own pegs.
      // This changes the actual jet origin, never adds attraction to a target.
      const c = this.scene.chamber;
      this.scene.pumps.forEach((pump, i) => {
        const target = c.left + (c.right - c.left) * (i === 0 ? 0.32 : 0.68);
        pump.x = this.pegs.reduce((a, b) =>
          Math.abs(a.x - target) < Math.abs(b.x - target) ? a : b,
        ).x;
      });
    }
    this.cooldowns = this.scene.pumps.map(() => -10);
    this.makeRings();
  }
  makeRings() {
    const c = this.scene.chamber,
      n = this.scene.objects?.length ?? this.config.ringCount;
    this.rings = Array.from({ length: n }, (_, i) => {
      const o = this.scene.objects?.[i];
      return {
        id: i,
        x: o?.x ?? c.left + 80 + ((c.right - c.left - 160) * (i + 0.5)) / n,
        y: o?.y ?? c.bottom - 22 - hash(i + 4) * 21,
        vx: 0,
        vy: 0,
        angle: (hash(i + 2) - 0.5) * 0.32,
        spin: 0,
        radius: o?.radius ?? 17,
        color: o?.color ?? COLORS[i % COLORS.length],
        peg: null,
        slot: 0,
        settle: 0,
      };
    });
  }
  update(settings) {
    const old = this.config;
    this.config = options({ ...old, ...settings });
    const reset = ["ringCount", "layout", "mode", "shape", "timer"].some(
      (k) => old[k] !== this.config[k],
    );
    if (reset) this.reset();
    return reset;
  }
  start() {
    this.reset();
    this.challenge = "playing";
  }
  pump(index = 0) {
    if (
      this.challenge === "finished" ||
      (this.config.mode === "challenge" && this.challenge !== "playing")
    )
      return false;
    const p = this.scene.pumps[index];
    if (!p || this.time - this.cooldowns[index] < 0.16) return false;
    this.cooldowns[index] = this.time;
    this.pumpCount++;
    this.bursts.push({ index, age: 0, id: this.pumpCount });
    for (const r of this.rings) {
      if (r.peg !== null) continue;
      const d = (r.x - p.x) / p.spread,
        falloff = Math.exp(-d * d * 2.5),
        height = clamp(
          (r.y - this.scene.chamber.top) / (p.y - this.scene.chamber.top),
          0.12,
          1,
        );
      const force = this.config.strength * falloff * (0.5 + 0.5 * height);
      // Distributed impulse from a wide upward water jet, with inward entrainment.
      r.vy = clamp(r.vy - (255 + 75 * height) * force, -455, 170);
      r.vx = clamp(r.vx + ((p.x - r.x) * 0.55 + p.drift) * force, -130, 130);
      r.spin += (hash(r.id + this.pumpCount * 13) - 0.5) * force * 1.8;
    }
    for (let i = 0; i < 15; i++)
      this.bubbles.push({
        x: p.x + (hash(this.pumpCount * 31 + i) - 0.5) * 42,
        y: p.y,
        r: 1.2 + hash(i * 3 + this.pumpCount) * 3.8,
        v: 45 + hash(i + 51) * 70,
        phase: hash(i + this.pumpCount) * 6.28,
        age: 0,
      });
    if (this.bubbles.length > 160)
      this.bubbles.splice(0, this.bubbles.length - 160);
    this.events.push({ type: "pump", index, time: this.time });
    return true;
  }
  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0)
      throw Error("Elapsed time must be finite and nonnegative.");
    this.accumulator += Math.min(dt, 0.25);
    while (this.accumulator >= STEP - 1e-10) {
      this.step(STEP);
      this.accumulator -= STEP;
    }
    return this.state();
  }
  step(dt) {
    this.time += dt;
    if (this.config.mode === "challenge" && this.challenge === "playing") {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining <= 0) {
        this.challenge = "finished";
        this.events.push({
          type: "finish",
          score: this.score(),
          time: this.time,
        });
      }
    }
    if (this.challenge === "finished") return;
    const c = this.scene.chamber,
      g = 58 * this.config.buoyancy,
      drag = 0.56;
    for (const b of this.bursts) b.age += dt;
    this.bursts = this.bursts.filter((b) => b.age < 1.8);
    for (const b of this.bubbles) {
      b.age += dt;
      b.y -= b.v * dt;
      b.x += Math.sin(b.age * 3 + b.phase) * 12 * dt;
    }
    this.bubbles = this.bubbles.filter((b) => b.y > c.top + 12 && b.age < 8);
    for (const r of this.rings) {
      if (r.peg !== null) {
        const p = this.pegs.find((p) => p.id === r.peg);
        const target = p.base - 9 - r.slot * this.scene.scoring.stackSpacing;
        r.settle = Math.min(1, r.settle + dt * 1.8);
        r.y += (target - r.y) * (1 - Math.exp(-dt * 7));
        r.x += (p.x - r.x) * (1 - Math.exp(-dt * 12));
        r.angle *= Math.exp(-dt * 8);
        continue;
      }
      const oldY = r.y;
      const nearFloor = r.y > c.bottom - 26;
      let current =
        Math.sin(r.y * 0.018 + this.time * 0.85 + r.id * 0.2) *
        9 *
        this.config.turbulence;
      for (const b of this.bursts) {
        const p = this.scene.pumps[b.index];
        current +=
          Math.sin(this.time * 6 + r.id) *
          Math.exp(-b.age * 3) *
          12 *
          this.config.turbulence *
          Math.exp(-(((r.x - p.x) / 220) ** 2));
      }
      r.vx = (r.vx + current * dt) * Math.exp(-dt * (nearFloor ? 2.5 : drag));
      r.vy = (r.vy + g * dt) * Math.exp(-dt * drag);
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.spin *= Math.exp(-dt * 2);
      const target = clamp(r.vx * 0.006, -0.5, 0.5);
      r.angle += (target - r.angle) * dt * 3 + r.spin * dt;
      r.angle = clamp(r.angle, -0.6, 0.6);
      const limits = this.limits(r.y, r.radius);
      if (r.x < limits[0]) {
        r.x = limits[0];
        r.vx = Math.abs(r.vx) * 0.35;
      }
      if (r.x > limits[1]) {
        r.x = limits[1];
        r.vx = -Math.abs(r.vx) * 0.35;
      }
      if (r.y < c.top + 20) {
        r.y = c.top + 20;
        r.vy = Math.abs(r.vy) * 0.25;
      }
      if (r.y > c.bottom - 18) {
        r.y = c.bottom - 18;
        r.vy = -Math.abs(r.vy) * 0.2;
        if (Math.abs(r.vy) < 6) r.vy = 0;
        r.angle *= Math.exp(-dt * 4);
      }
      if (r.vy > 0) {
        for (const p of this.pegs) {
          const capacity = Math.floor(
            (p.base - p.tip - 15) / this.scene.scoring.stackSpacing,
          );
          if (
            p.count < capacity &&
            oldY <= p.tip &&
            r.y >= p.tip &&
            Math.abs(r.x - p.x) <
              Math.min(this.scene.scoring.captureTolerance, r.radius - 6) &&
            Math.abs(r.angle) < 0.55
          ) {
            r.peg = p.id;
            r.slot = p.count++;
            r.vx = r.vy = r.spin = 0;
            this.total += this.scene.scoring.points;
            this.events.push({
              type: "catch",
              ring: r.id,
              peg: p.id,
              time: this.time,
            });
            break;
          }
        }
      }
    }
    // Soft elliptical contacts preserve the visual separation of loose rings.
    for (let i = 0; i < this.rings.length; i++)
      for (let j = i + 1; j < this.rings.length; j++) {
        const a = this.rings[i],
          b = this.rings[j];
        if (a.peg !== null || b.peg !== null) continue;
        const dx = b.x - a.x,
          dy = b.y - a.y,
          rx = (a.radius + b.radius) * 0.82,
          ry = 10,
          dist = Math.hypot(dx / rx, dy / ry);
        if (dist < 1 && dist > 0.0001) {
          const push = (1 - dist) * 0.22;
          a.x -= dx * push;
          b.x += dx * push;
          a.y -= dy * push;
          b.y += dy * push;
        }
      }
    if (this.rings.every((r) => r.peg !== null)) {
      if (this.config.mode === "endless") {
        this.roundWait += dt;
        if (this.roundWait > 2.2) {
          this.roundWait = 0;
          this.round++;
          this.pegs.forEach((p) => (p.count = 0));
          this.makeRings();
          this.events.push({
            type: "round",
            round: this.round,
            time: this.time,
          });
        }
      } else if (
        this.config.mode === "challenge" &&
        this.challenge === "playing"
      ) {
        this.challenge = "finished";
        this.events.push({
          type: "finish",
          score: this.score(),
          time: this.time,
        });
      }
    }
  }
  limits(y, r = 17) {
    const c = this.scene.chamber,
      corner =
        this.config.shape === "porthole"
          ? Math.min(142, (c.bottom - c.top) / 2)
          : 46;
    const yy = clamp(y, c.top + r, c.bottom - r);
    let inset = 0;
    if (yy < c.top + corner)
      inset =
        corner -
        Math.sqrt(Math.max(0, corner * corner - (c.top + corner - yy) ** 2));
    if (yy > c.bottom - corner)
      inset =
        corner -
        Math.sqrt(
          Math.max(0, corner * corner - (yy - (c.bottom - corner)) ** 2),
        );
    return [c.left + r + inset, c.right - r - inset];
  }
  score() {
    return (
      this.rings.filter((r) => r.peg !== null).length *
      this.scene.scoring.points
    );
  }
  state() {
    return {
      score: this.score(),
      caught: this.rings.filter((r) => r.peg !== null).length,
      count: this.rings.length,
      total: this.total,
      round: this.round,
      pumps: this.pumpCount,
      time: this.time,
      remaining: this.remaining,
      challenge: this.challenge,
      complete: this.rings.every((r) => r.peg !== null),
      moving: this.rings.some(
        (r) => r.peg === null && (Math.abs(r.vx) > 2 || Math.abs(r.vy) > 2),
      ),
    };
  }
  drainEvents() {
    return this.events.splice(0);
  }
}
