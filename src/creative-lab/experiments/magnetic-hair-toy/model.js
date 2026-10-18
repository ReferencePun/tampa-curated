export const WIDTH = 900,
  HEIGHT = 760;
export const DEFAULTS = Object.freeze({
  density: 3800,
  strength: 1.15,
  radius: 62,
  clumping: 0.45,
  face: "milo",
  mode: "free",
  resetSpeed: 1,
  style: "lithograph",
  hiddenMagnet: false,
  template: "handlebar",
  guides: true,
  challengeLength: 45,
});
export const PRESETS = {
  barber: { name: "The little barber shop", settings: { ...DEFAULTS } },
  botanist: {
    name: "Cleo’s wild eyebrows",
    settings: {
      ...DEFAULTS,
      face: "cleo",
      mode: "template",
      template: "brows",
      style: "blueprint",
      radius: 40,
      clumping: 0.65,
    },
  },
  cosmic: {
    name: "A very unusual cat",
    settings: {
      ...DEFAULTS,
      face: "cosmo",
      mode: "silly",
      template: "antennae",
      style: "sunshine",
      strength: 1.4,
      radius: 75,
      clumping: 0.25,
    },
  },
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function random(i, salt = 0) {
  let n =
    (Math.imul(i + 1, 1597334677) ^ Math.imul(salt + 7, 3812015801)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 2246822507) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 3266489909) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function options(input = {}) {
  const c = { ...DEFAULTS },
    enums = {
      face: ["milo", "cleo", "cosmo"],
      mode: ["free", "timed", "template", "silly"],
      style: ["lithograph", "blueprint", "sunshine"],
      template: ["handlebar", "brows", "beard", "crown", "antennae", "spiral"],
    };
  for (const [k, v] of Object.entries(enums))
    if (v.includes(input[k])) c[k] = input[k];
  for (const [k, a, b, s] of [
    ["density", 1200, 7000, 100],
    ["strength", 0.3, 2.5, 0.05],
    ["radius", 25, 110, 1],
    ["clumping", 0, 1, 0.05],
    ["resetSpeed", 0.4, 2, 0.1],
    ["challengeLength", 20, 90, 5],
  ])
    if (Number.isFinite(input[k]))
      c[k] = Number(
        (a + Math.round((clamp(input[k], a, b) - a) / s) * s).toFixed(3),
      );
  for (const k of ["hiddenMagnet", "guides"])
    if (typeof input[k] === "boolean") c[k] = input[k];
  return c;
}
export function reservoir(i) {
  return {
    x: 74 + random(i, 1) * 752,
    y: 644 + Math.pow(random(i, 2), 0.7) * 62,
    angle: random(i, 3) * Math.PI,
  };
}
export class FilingsField {
  constructor(settings = {}) {
    this.config = options(settings);
    this.count = 0;
    this.magnet = { x: 450, y: 675, down: false, heading: -Math.PI / 2 };
    this.tickCount = 0;
    this.shaking = false;
    this.resize(this.config.density);
  }
  resize(count) {
    count = options({ density: count }).density;
    const old = { x: this.x, y: this.y, angle: this.angle, count: this.count };
    this.count = count;
    for (const k of ["x", "y", "vx", "vy", "angle"])
      this[k] = new Float32Array(count);
    this.held = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const src = old.count > count ? Math.floor((i * old.count) / count) : i;
      if (src < old.count) {
        this.x[i] = old.x[src];
        this.y[i] = old.y[src];
        this.angle[i] = old.angle[src];
      } else {
        const p = reservoir(i);
        this.x[i] = p.x;
        this.y[i] = p.y;
        this.angle[i] = p.angle;
      }
    }
    this.shaking = false;
  }
  update(settings) {
    const c = options({ ...this.config, ...settings });
    if (c.density !== this.count) this.resize(c.density);
    this.config = c;
  }
  reset() {
    this.magnet.down = false;
    this.held.fill(0);
    this.vx.fill(0);
    this.vy.fill(0);
    for (let i = 0; i < this.count; i++) {
      const p = reservoir(i);
      this.x[i] = p.x;
      this.y[i] = p.y;
      this.angle[i] = p.angle;
    }
    this.shaking = false;
    this.shakeFrom = null;
  }
  move(x, y, capture = true) {
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw Error("Magnet coordinates must be finite.");
    x = clamp(x, 22, WIDTH - 22);
    y = clamp(y, 22, HEIGHT - 22);
    const a = { ...this.magnet },
      dx = x - a.x,
      dy = y - a.y,
      d2 = dx * dx + dy * dy;
    if (d2 > 0.2) this.magnet.heading = Math.atan2(dy, dx);
    if (capture && this.magnet.down && !this.shaking) {
      const coupling = 0.7 + this.config.strength * 0.08;
      for (let i = 0; i < this.count; i++)
        if (this.held[i]) {
          this.x[i] = clamp(this.x[i] + dx * coupling, 22, WIDTH - 22);
          this.y[i] = clamp(this.y[i] + dy * coupling, 22, HEIGHT - 22);
        }
    }
    this.magnet.x = x;
    this.magnet.y = y;
    if (capture && this.magnet.down && !this.shaking)
      this.capture(a.x, a.y, x, y);
  }
  engage() {
    if (this.shaking) return;
    this.magnet.down = true;
    this.capture(this.magnet.x, this.magnet.y, this.magnet.x, this.magnet.y);
  }
  release() {
    this.magnet.down = false;
    this.held.fill(0);
    this.vx.fill(0);
    this.vy.fill(0);
  }
  capacity() {
    return clamp(
      Math.round((Math.PI * (this.config.radius * 0.48) ** 2) / 7),
      100,
      1500,
    );
  }
  capture(ax, ay, bx, by) {
    let held = this.held.reduce((sum, n) => sum + n, 0);
    const capacity = this.capacity();
    const r = this.config.radius,
      dx = bx - ax,
      dy = by - ay,
      d2 = dx * dx + dy * dy;
    for (let i = 0; i < this.count && held < capacity; i++) {
      if (this.held[i]) continue;
      const t = d2
        ? clamp(((this.x[i] - ax) * dx + (this.y[i] - ay) * dy) / d2, 0, 1)
        : 0;
      const px = this.x[i] - ax - t * dx,
        py = this.y[i] - ay - t * dy;
      if (px * px + py * py < r * r) {
        this.held[i] = 1;
        held++;
      }
    }
  }
  loadPinch() {
    this.engage();
    let n = 0;
    const room = Math.max(
      0,
      this.capacity() - this.held.reduce((sum, n) => sum + n, 0),
    );
    for (let i = 0; i < this.count && n < Math.min(260, room); i++)
      if (this.y[i] > 610 && !this.held[i]) {
        this.held[i] = 1;
        n++;
      }
    return n;
  }
  target(i) {
    const r = this.config.radius * (0.3 + 0.22 * (1 - this.config.clumping)),
      a = random(i, 8) * Math.PI * 2,
      d = Math.sqrt(random(i, 9)) * r;
    let u = Math.cos(a) * d,
      v = Math.sin(a) * d;
    const cl = this.config.clumping;
    v = v * (1 - cl) + (Math.round(v / 9) * 9 + (random(i, 10) - 0.5) * 2) * cl;
    u *= 1 + cl * 0.2;
    const h = this.magnet.heading,
      c = Math.cos(h),
      s = Math.sin(h);
    return {
      x: clamp(this.magnet.x + u * c - v * s, 22, WIDTH - 22),
      y: clamp(this.magnet.y + u * s + v * c, 22, HEIGHT - 22),
      angle:
        h + (random(i, 11) - 0.5) * (1.6 - cl) + Math.sin(u * 0.13) * cl * 0.25,
    };
  }
  step(dt = 1 / 60, snap = false) {
    dt = Number.isFinite(dt) ? clamp(dt, 0, 1 / 30) : 0;
    if (this.shaking || !this.magnet.down) return false;
    this.tickCount++;
    const force = 54 * this.config.strength,
      damping = Math.exp(-dt * 14);
    let active = false;
    for (let i = 0; i < this.count; i++) {
      if (!this.held[i]) continue;
      active = true;
      const p = this.target(i);
      if (snap) {
        this.x[i] = p.x;
        this.y[i] = p.y;
        this.angle[i] = p.angle;
        continue;
      }
      this.vx[i] = (this.vx[i] + (p.x - this.x[i]) * force * dt) * damping;
      this.vy[i] = (this.vy[i] + (p.y - this.y[i]) * force * dt) * damping;
      this.x[i] = clamp(this.x[i] + this.vx[i] * dt, 22, WIDTH - 22);
      this.y[i] = clamp(this.y[i] + this.vy[i] * dt, 22, HEIGHT - 22);
      let da =
        ((((p.angle - this.angle[i] + Math.PI / 2) % Math.PI) + Math.PI) %
          Math.PI) -
        Math.PI / 2;
      this.angle[i] += da * (1 - Math.exp(-dt * 11));
    }
    return active;
  }
  beginShake() {
    this.release();
    this.shaking = true;
    this.shakeFrom = {
      x: this.x.slice(),
      y: this.y.slice(),
      angle: this.angle.slice(),
    };
  }
  shake(progress) {
    if (!this.shakeFrom) return;
    const p = clamp(progress, 0, 1),
      ease = p * p * (3 - 2 * p);
    for (let i = 0; i < this.count; i++) {
      const target = reservoir(i),
        r = random(i, 18),
        w = Math.sin(p * Math.PI) * Math.sin(p * 37 + r * 6);
      this.x[i] = clamp(
        this.shakeFrom.x[i] * (1 - ease) + target.x * ease + w * 18,
        22,
        WIDTH - 22,
      );
      this.y[i] = clamp(
        this.shakeFrom.y[i] * (1 - ease) +
          target.y * ease +
          Math.sin(p * Math.PI) * Math.cos(p * 27 + r * 7) * 12,
        22,
        HEIGHT - 22,
      );
      this.angle[i] =
        this.shakeFrom.angle[i] * (1 - ease) + target.angle * ease + w * 0.6;
    }
    if (p === 1) {
      this.shaking = false;
      this.shakeFrom = null;
    }
  }
  statistics() {
    let held = 0,
      placed = 0,
      energy = 0,
      checksum = 0;
    for (let i = 0; i < this.count; i++) {
      held += this.held[i];
      if (this.y[i] < 600) placed++;
      energy += Math.abs(this.vx[i]) + Math.abs(this.vy[i]);
      checksum += ((i % 7) + 1) * (this.x[i] + this.y[i] * 0.3);
    }
    return {
      count: this.count,
      held,
      placed,
      energy: energy / this.count,
      checksum: Math.round(checksum),
      ticks: this.tickCount,
    };
  }
  serialize() {
    return {
      version: 1,
      width: WIDTH,
      height: HEIGHT,
      settings: { ...this.config },
      particles: Array.from({ length: this.count }, (_, i) => [
        Number(this.x[i].toFixed(3)),
        Number(this.y[i].toFixed(3)),
        Number(this.angle[i].toFixed(4)),
      ]),
    };
  }
  load(input) {
    const doc = readArtwork(input);
    this.config = options(doc.settings);
    this.resize(doc.particles.length);
    this.release();
    doc.particles.forEach((p, i) => {
      this.x[i] = p[0];
      this.y[i] = p[1];
      this.angle[i] = p[2];
    });
    return doc;
  }
  dispose() {
    for (const k of ["x", "y", "vx", "vy", "angle", "held"]) this[k] = null;
    this.shakeFrom = null;
    this.count = 0;
  }
}
export function readArtwork(input) {
  const d = typeof input === "string" ? JSON.parse(input) : input;
  if (
    !d ||
    d.version !== 1 ||
    d.width !== WIDTH ||
    d.height !== HEIGHT ||
    !Array.isArray(d.particles) ||
    d.particles.length < 1200 ||
    d.particles.length > 7000 ||
    d.particles.length % 100 !== 0
  )
    throw Error(
      "Use a saved version 1 grooming drawing (1,200–7,000 filings).",
    );
  if (
    d.particles.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 3 ||
        p.some((n) => !Number.isFinite(n)) ||
        p[0] < 22 ||
        p[0] > WIDTH - 22 ||
        p[1] < 22 ||
        p[1] > HEIGHT - 22 ||
        Math.abs(p[2]) > 1000,
    )
  )
    throw Error("The drawing contains invalid filing coordinates.");
  return {
    version: 1,
    width: WIDTH,
    height: HEIGHT,
    settings: options({ ...d.settings, density: d.particles.length }),
    particles: d.particles.map((p) => [...p]),
  };
}
