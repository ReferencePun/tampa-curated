/** Portable spin-art model. Paper coordinates have radius 1; screen y points down. */
export const TAU = Math.PI * 2,
  STEP = 1 / 120,
  MAX_MARKS = 180000;
export const PALETTES = {
  studio: {
    name: "Studio primaries",
    colors: ["#dc573c", "#285db5", "#e8b632", "#297b64", "#e9a9a1", "#272f32"],
  },
  citrus: {
    name: "Citrus & cobalt",
    colors: ["#ed7036", "#e9bf38", "#234e9c", "#ce4382", "#f3dd91", "#376e64"],
  },
  mineral: {
    name: "Mineral pigments",
    colors: ["#a04a39", "#416d77", "#b6924d", "#444655", "#82967a", "#d2b09c"],
  },
  electric: {
    name: "After hours",
    colors: ["#ed779c", "#95c9d1", "#e6c75e", "#8d86c0", "#e2e3ce", "#dd7049"],
  },
  monochrome: {
    name: "Black / blue / red",
    colors: ["#272f32", "#315c9a", "#b93f34", "#778192", "#bc8778", "#e1d4b6"],
  },
};
export const PAPERS = { ivory: "#f6f0de", white: "#fcfbf5", night: "#1f3039" };
export const DEFAULTS = Object.freeze({
  speed: 36,
  direction: "clockwise",
  style: "stream",
  thickness: 14,
  dripRate: 24,
  palette: "studio",
  ink: "#dc573c",
  colors: 1,
  spread: 0.55,
  paperSize: 1024,
  opacity: 0.95,
  viscosity: 0.55,
  autoDrip: false,
  paper: "ivory",
});
export const PRESETS = {
  fiesta: {
    name: "01 / Vermilion hour",
    settings: { ...DEFAULTS, speed: 42, colors: 2, spread: 0.7 },
  },
  ink: {
    name: "02 / Carbon study",
    settings: {
      ...DEFAULTS,
      speed: 25,
      palette: "monochrome",
      ink: "#272f32",
      style: "bloom",
      thickness: 7,
      spread: 0.8,
      opacity: 0.65,
    },
  },
  orbit: {
    name: "03 / Little orbits",
    settings: {
      ...DEFAULTS,
      speed: 28,
      style: "dots",
      thickness: 12,
      dripRate: 15,
      palette: "citrus",
      ink: "#ed7036",
      colors: 3,
      spread: 0.2,
    },
  },
  night: {
    name: "04 / After hours",
    settings: {
      ...DEFAULTS,
      speed: 48,
      style: "splatter",
      thickness: 10,
      dripRate: 18,
      palette: "electric",
      ink: "#95c9d1",
      colors: 3,
      paper: "night",
      spread: 0.8,
    },
  },
  fine: {
    name: "05 / The long line",
    settings: {
      ...DEFAULTS,
      speed: 20,
      style: "marker",
      thickness: 3,
      palette: "mineral",
      ink: "#416d77",
      spread: 0,
      opacity: 0.8,
    },
  },
};
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const hash = (n) => {
  const s = Math.sin(n * 127.1 + 19.19) * 43758.5453;
  return s - Math.floor(s);
};
export function options(input = {}) {
  const o = { ...DEFAULTS, ...input };
  for (const [k, v] of Object.entries({
    direction: ["clockwise", "counterclockwise"],
    style: ["splatter", "stream", "dots", "marker", "bloom"],
    palette: Object.keys(PALETTES),
    paper: Object.keys(PAPERS),
  }))
    if (!v.includes(o[k])) o[k] = DEFAULTS[k];
  for (const [k, min, max, step] of [
    ["speed", 0, 90, 1],
    ["thickness", 1, 30, 1],
    ["dripRate", 4, 60, 1],
    ["colors", 1, 4, 1],
    ["spread", 0, 1, 0.05],
    ["viscosity", 0.1, 1, 0.05],
    ["paperSize", 512, 2048, 256],
    ["opacity", 0.1, 1, 0.05],
  ])
    o[k] = +(
      Math.round(
        clamp(Number.isFinite(+o[k]) ? +o[k] : DEFAULTS[k], min, max) / step,
      ) * step
    ).toFixed(5);
  if (!/^#[\da-f]{6}$/i.test(o.ink)) o.ink = DEFAULTS.ink;
  o.autoDrip = !!o.autoDrip;
  return Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, o[k]]));
}
export function paperPoint(x, y, angle) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return [x * c + y * s, -x * s + y * c];
}
export function screenPoint(x, y, angle) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c];
}
export class SpinArt {
  constructor(settings = {}) {
    this.config = options(settings);
    this.clear();
  }
  clear() {
    this.angle = 0;
    this.omega = 0;
    this.time = 0;
    this.accumulator = 0;
    this.motor = false;
    this.pointer = { x: 0.45, y: -0.2, down: false, pressure: 1 };
    this.previous = null;
    this.pool = null;
    this.marks = [];
    this.visibleCount = 0;
    this.pending = [];
    this.wet = [];
    this.spills = [];
    this.hidden = new Set();
    this.groups = [];
    this.redoGroups = [];
    this.group = 0;
    this.autoGroup = 0;
    this.serial = 1;
    this.emitClock = 0;
    this.autoClock = 0;
    this.saturated = false;
    this.autoArmed = false;
    this.pointerGroup = 0;
  }
  beginGroup() {
    this.redoGroups = [];
    const id = ++this.group;
    this.groups.push(id);
    return id;
  }
  setMotor(on) {
    this.motor = !!on;
    if (!on) this.omega = 0;
    this.previous = null;
  }
  setAuto(on) {
    this.autoArmed = !!on;
    if (on && !this.autoGroup) {
      this.autoGroup = this.beginGroup();
      this.previous = null;
    }
    if (!on) this.autoGroup = 0;
    this.autoClock = 0;
  }
  update(settings) {
    const old = this.config;
    this.config = options({ ...old, ...settings });
    if (
      old.style !== this.config.style ||
      old.ink !== this.config.ink ||
      old.colors !== this.config.colors
    )
      this.previous = null;
    if (!this.config.autoDrip) this.setAuto(false);
  }
  move(x, y, pressure = 1) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.pointer.x = clamp(x, -1.4, 1.4);
    this.pointer.y = clamp(y, -1.4, 1.4);
    this.pointer.pressure = clamp(pressure, 0.15, 1);
  }
  begin(x, y, pressure = 1) {
    this.move(x, y, pressure);
    this.pointer.down = true;
    this.pointerGroup = this.beginGroup();
    this.emitClock = 1;
    this.previous = null;
    this.lastPointer = [x, y];
    this.deposit(this.pointer.x, this.pointer.y, this.pointerGroup, true);
  }
  end() {
    this.pointer.down = false;
    this.previous = null;
  }
  mark(
    x1,
    y1,
    x2,
    y2,
    width,
    color,
    alpha,
    kind,
    group,
    endWidth = width,
    seed = 0,
  ) {
    if (this.saturated || !Number.isFinite(x1 + y1 + x2 + y2 + width + alpha))
      return;
    if (Math.hypot(x1, y1) > 1.08 && Math.hypot(x2, y2) > 1.08) return;
    if (this.marks.length >= MAX_MARKS) {
      this.saturated = true;
      this.wet = [];
      this.end();
      this.setAuto(false);
      return;
    }
    const m = [
      group,
      +x1.toFixed(5),
      +y1.toFixed(5),
      +x2.toFixed(5),
      +y2.toFixed(5),
      +clamp(width, 0.0002, 0.5).toFixed(5),
      color,
      +clamp(alpha, 0.002, 1).toFixed(4),
      kind,
    ];
    if (kind === "ribbon" || kind === "bead")
      m.push(+clamp(endWidth, 0.0002, 0.5).toFixed(5), seed);
    this.marks.push(m);
    this.visibleCount++;
    this.pending.push(m);
  }
  deposit(x, y, group, force = false) {
    const cfg = this.config,
      palette = PALETTES[cfg.palette].colors,
      n = cfg.colors,
      inside = Math.hypot(x, y) < 1.025;
    if (!inside) {
      this.previous = null;
      return;
    }
    for (let j = 0; j < n; j++) {
      const sx = x + (j - (n - 1) / 2) * 0.055,
        sy = y + (j % 2) * 0.016,
        [px, py] = paperPoint(sx, sy, this.angle),
        id = this.serial++,
        r = hash(id),
        color =
          j === 0
            ? cfg.ink
            : palette[
                (palette.indexOf(cfg.ink) + j + palette.length) % palette.length
              ],
        w =
          (cfg.thickness / (cfg.style === "marker" ? 512 : 270)) *
          (0.65 + 0.35 * this.pointer.pressure),
        alpha = cfg.opacity;
      if (cfg.style === "marker" || cfg.style === "stream") {
        const prev = this.previous?.[j] ?? [px, py];
        if (cfg.style === "marker")
          this.mark(prev[0], prev[1], px, py, w, color, alpha, "line", group);
        else {
          const width =
            w *
            (1.45 +
              0.12 * Math.sin(this.time * 7.1) +
              0.06 * Math.sin(this.time * 23));
          this.mark(
            prev[0],
            prev[1],
            px,
            py,
            width,
            color,
            alpha,
            "ribbon",
            group,
            width,
            id,
          );
          if (force) {
            // Standing still on stopped paper makes a growing puddle, not a marker dot.
            if (
              !this.pool ||
              Math.hypot(px - this.pool.x, py - this.pool.y) > w * 0.8
            )
              this.pool = { x: px, y: py, amount: 1 };
            else this.pool.amount = Math.min(8, this.pool.amount + 0.24);
            if (!this.previous || Math.abs(this.omega) < 0.15)
              this.mark(
                px,
                py,
                px,
                py,
                width * Math.sqrt(this.pool.amount),
                color,
                alpha,
                "bead",
                group,
                width,
                id,
              );
            this.spawn(px, py, width * 0.85, color, alpha, group, id, 1);
          }
        }
      } else if (force) {
        if (cfg.style === "dots") {
          this.mark(
            px,
            py,
            px,
            py,
            w * (1.5 + r * 0.8),
            color,
            alpha,
            "bead",
            group,
            w,
            id,
          );
          this.spawn(px, py, w * 0.55, color, alpha, group, id, 0.35);
        }
        if (cfg.style === "splatter")
          for (let k = 0; k < 6; k++) {
            const a = hash(id + k * 31) * TAU,
              d = hash(id + k * 19) * w * 3.2,
              xx = px + Math.cos(a) * d,
              yy = py + Math.sin(a) * d,
              ww = w * (0.14 + hash(id + k * 61) * 0.55);
            this.mark(
              xx,
              yy,
              xx,
              yy,
              ww,
              color,
              alpha * (0.65 + 0.35 * hash(id + k)),
              "bead",
              group,
              ww,
              id + k * 31,
            );
            this.spawn(xx, yy, ww, color, alpha, group, id + k * 19, 1.2);
          }
        if (cfg.style === "bloom") {
          this.mark(
            px,
            py,
            px,
            py,
            w * 2.2,
            color,
            alpha * 0.25,
            "wash",
            group,
          );
          for (let k = 0; k < 4; k++)
            this.spawn(
              px + (hash(id + k * 2) - 0.5) * w,
              py + (hash(id + k * 3) - 0.5) * w,
              w * (0.15 + hash(id + k * 11) * 0.35),
              color,
              alpha * 0.55,
              group,
              id + k * 37,
              1.7,
            );
        }
      }
    }
    this.previous = Array.from({ length: n }, (_, j) =>
      paperPoint(
        x + (j - (n - 1) / 2) * 0.055,
        y + (j % 2) * 0.016,
        this.angle,
      ),
    );
  }
  spawn(x, y, w, color, alpha, group, id, mobility, merge = true) {
    if (this.wet.length >= 800 || this.config.spread === 0) return;
    // Nearby fresh droplets of the same paint merge into a heavier puddle.
    for (
      let i = this.wet.length - 1;
      i >= Math.max(0, this.wet.length - 100);
      i--
    ) {
      const p = this.wet[i];
      if (
        p.group === group &&
        p.color === color &&
        p.age < 0.2 &&
        merge &&
        Math.hypot(x - p.x, y - p.y) < (w + p.w) * 0.32
      ) {
        p.w = Math.min(0.16, Math.sqrt(p.w * p.w + w * w * 0.45));
        p.volume = Math.min(1.5, p.volume + 0.18);
        return;
      }
    }
    // Mix only fresh contacting pigment. Dry layers keep their own color.
    for (
      let i = this.wet.length - 1;
      i >= Math.max(0, this.wet.length - 160);
      i--
    ) {
      const other = this.wet[i];
      if (other.age > 0.7 || other.color === color) continue;
      if (Math.hypot(x - other.x, y - other.y) < (w + other.w) * 0.42) {
        color =
          "#" +
          [1, 3, 5]
            .map((k) =>
              Math.round(
                Math.exp(
                  Math.log(Math.max(1, parseInt(color.slice(k, k + 2), 16))) *
                    0.82 +
                    Math.log(
                      Math.max(1, parseInt(other.color.slice(k, k + 2), 16)),
                    ) *
                      0.18,
                ),
              )
                .toString(16)
                .padStart(2, "0"),
            )
            .join("");
        break;
      }
    }
    const parcel = {
      x,
      y,
      w,
      color,
      alpha,
      group,
      id,
      age: 0,
      px: x,
      py: y,
      life: 1.25 + hash(id) * 0.8,
      vx: 0,
      vy: 0,
      volume: 1,
      lastWidth: w,
      lastMarkAge: 0,
      viscosity: this.config.viscosity,
      branched: false,
      mobility,
      phase: hash(id + 8) * TAU,
    };
    this.wet.push(parcel);
    return parcel;
  }
  step(dt) {
    this.time += dt;
    const target = this.motor
      ? ((this.config.speed * TAU) / 60) *
        (this.config.direction === "clockwise" ? 1 : -1)
      : 0;
    this.omega += (target - this.omega) * (1 - Math.exp(-dt * 7));
    this.angle = (this.angle + this.omega * dt) % TAU;
    const current = [this.pointer.x, this.pointer.y];
    if (this.pointer.down) {
      this.emitClock += dt * this.config.dripRate;
      const force = this.emitClock >= 1;
      if (force) this.emitClock %= 1;
      // The line is in paper coordinates. A stationary hand traces an arc as the paper turns.
      const prev = this.lastPointer ?? current,
        dist = Math.hypot(current[0] - prev[0], current[1] - prev[1]);
      const samples = Math.min(
        100,
        Math.max(
          1,
          Math.ceil(dist / 0.015),
          Math.ceil(Math.abs(this.omega * dt) / 0.02),
        ),
      );
      for (let k = 1; k <= samples; k++)
        this.deposit(
          prev[0] + ((current[0] - prev[0]) * k) / samples,
          prev[1] + ((current[1] - prev[1]) * k) / samples,
          this.pointerGroup,
          force && k === samples,
        );
    }
    this.lastPointer = current;
    if (this.autoArmed) {
      this.autoClock += dt * this.config.dripRate;
      const force = this.autoClock >= 1;
      if (force) this.autoClock %= 1;
      // A gently traveling nozzle; hovering changes its center without touching the paper.
      const radius = clamp(
          Math.hypot(...current) + Math.sin(this.time * 0.75) * 0.07,
          0.06,
          0.88,
        ),
        a = Math.atan2(current[1], current[0]);
      if (!this.pointer.down)
        this.deposit(
          Math.cos(a) * radius,
          Math.sin(a) * radius,
          this.autoGroup,
          force,
        );
    }
    const spread = this.config.spread,
      spin = Math.abs(this.omega);
    for (const p of this.wet) {
      const r = Math.hypot(p.x, p.y),
        dry = Math.min(1, p.age / p.life),
        drag = 2.4 + p.viscosity * 8 + dry * dry * 14;
      // Viscous outward acceleration in rotating paper coordinates. Coriolis lag
      // curves the rivulets; changing rotation reverses that lag, never the outward force.
      const mobility = spread * p.mobility * (1 - p.viscosity * 0.6),
        radial = spin * spin * 0.62 * mobility;
      const vx = p.vx,
        vy = p.vy,
        rough = Math.sin(p.phase + p.age * 8) * 0.025 * mobility;
      p.vx += (p.x * radial + 2 * this.omega * vy * 0.3 - p.y * rough) * dt;
      p.vy += (p.y * radial - 2 * this.omega * vx * 0.3 + p.x * rough) * dt;
      p.vx *= Math.exp(-drag * dt);
      p.vy *= Math.exp(-drag * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt;
      const speed = Math.hypot(p.vx, p.vy),
        travel = Math.hypot(p.x - p.px, p.y - p.py);
      p.volume *= Math.exp(-(0.22 + speed * 1.5) * dt);
      const width = Math.max(
        0.0008,
        ((p.w * Math.sqrt(p.volume) * (1 - 0.35 * dry)) / (1 + speed * 0.2)) *
          (1 + 0.06 * Math.sin(p.phase + p.age * 11)),
      );
      if (
        r <= 1.035 &&
        ((p.age - p.lastMarkAge >= 1 / 24 &&
          travel > Math.max(0.006, p.w * 0.24)) ||
          p.age >= p.life ||
          r > 1)
      ) {
        this.mark(
          p.px,
          p.py,
          p.x,
          p.y,
          p.lastWidth,
          p.color,
          p.alpha * 0.96,
          "ribbon",
          p.group,
          width,
          p.id,
        );
        p.lastWidth = width;
        p.px = p.x;
        p.py = p.y;
        p.lastMarkAge = p.age;
      }
      // A finite bead splits into a smaller finger once, rather than endless noise.
      if (
        spread > 0 &&
        !p.branched &&
        spin > 3 &&
        p.age > 0.3 &&
        speed > 0.24 &&
        hash(p.id + 91) > 0.68 &&
        this.wet.length < 790
      ) {
        p.branched = true;
        p.volume *= 0.78;
        const side = hash(p.id + 21) > 0.5 ? 1 : -1;
        const child = this.spawn(
          p.x - (p.y / (r + 0.01)) * width * 0.4 * side,
          p.y + (p.x / (r + 0.01)) * width * 0.4 * side,
          width * 0.48,
          p.color,
          p.alpha,
          p.group,
          p.id + 19031,
          p.mobility * 1.3,
          false,
        );
        if (child) {
          child.branched = true;
          child.vx = p.vx - p.vy * 0.13 * side;
          child.vy = p.vy + p.vx * 0.13 * side;
        }
      }
      if (r > 1 && !p.spilled && this.spills.length < 500) {
        const [x, y] = screenPoint(p.x, p.y, this.angle),
          [vx, vy] = screenPoint(
            p.vx - this.omega * p.y,
            p.vy + this.omega * p.x,
            this.angle,
          );
        this.spills.push({
          x,
          y,
          vx,
          vy,
          w: width,
          color: p.color,
          group: p.group,
          age: 0,
        });
        p.spilled = true;
      }
    }
    for (const s of this.spills) {
      if (s.age < 0.16) {
        s.x += s.vx * dt * 0.15;
        s.y += s.vy * dt * 0.15;
        s.age += dt;
        const r = Math.hypot(s.x, s.y);
        if (r > 1.105) {
          s.x *= 1.105 / r;
          s.y *= 1.105 / r;
          s.age = 0.16;
        }
      }
    }

    this.wet = this.wet.filter(
      (p) =>
        p.age < p.life &&
        Math.hypot(p.x, p.y) < 1.03 &&
        !this.hidden.has(p.group),
    );
  }
  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0)
      throw Error("Elapsed time must be finite and nonnegative.");
    this.accumulator += Math.min(0.1, dt);
    while (this.accumulator >= STEP - 1e-10) {
      this.step(STEP);
      this.accumulator -= STEP;
    }
  }
  drain() {
    return this.pending.splice(0);
  }
  undo() {
    this.end();
    this.setAuto(false);
    const id = [...this.groups].reverse().find((id) => !this.hidden.has(id));
    if (id === undefined) return false;
    this.hidden.add(id);
    this.visibleCount = this.marks.reduce(
      (n, m) => n + !this.hidden.has(m[0]),
      0,
    );
    this.redoGroups.push(id);
    this.wet = this.wet.filter((p) => p.group !== id);
    this.previous = null;
    return true;
  }
  redo() {
    const id = this.redoGroups.pop();
    if (id === undefined) return false;
    this.hidden.delete(id);
    this.visibleCount = this.marks.reduce(
      (n, m) => n + !this.hidden.has(m[0]),
      0,
    );
    return true;
  }
  state() {
    return {
      marks: this.marks.length,
      visible: this.visibleCount,
      wet: this.wet.length,
      angle: this.angle,
      rpm: (this.omega * 60) / TAU,
      motor: this.motor,
      auto: this.autoArmed,
      time: this.time,
      saturated: this.saturated,
      undo: this.groups.some((id) => !this.hidden.has(id)),
      redo: !!this.redoGroups.length,
    };
  }
  serialize() {
    return {
      type: "spin-art",
      version: 2,
      settings: { ...this.config, autoDrip: false },
      angle: this.angle,
      marks: this.marks
        .filter((m) => !this.hidden.has(m[0]))
        .map((m) => [...m]),
    };
  }
  load(input) {
    const doc = readArtwork(input);
    this.clear();
    this.config = doc.settings;
    this.angle = doc.angle;
    this.marks = doc.marks;
    this.groups = [...new Set(this.marks.map((m) => m[0]))];
    this.group = this.groups.reduce((max, g) => Math.max(max, g), 0);
    this.visibleCount = this.marks.length;
    this.serial = this.marks.length + 1;
    this.pending = [...this.marks];
  }
}
export function readArtwork(input) {
  const d = typeof input === "string" ? JSON.parse(input) : input;
  if (
    !d ||
    d.type !== "spin-art" ||
    ![1, 2].includes(d.version) ||
    !Array.isArray(d.marks) ||
    d.marks.length > MAX_MARKS ||
    !d.settings ||
    typeof d.settings !== "object"
  )
    throw Error("Choose a supported spin-art artwork JSON.");
  if (Object.keys(d.settings).some((k) => !(k in DEFAULTS)))
    throw Error("Unknown artwork setting.");
  if (!Number.isFinite(d.angle) || Math.abs(d.angle) > TAU + 1e-5)
    throw Error("Invalid paper orientation.");
  const marks = d.marks.map((m) => {
    if (
      !Array.isArray(m) ||
      ![9, 11].includes(m.length) ||
      !Number.isInteger(m[0]) ||
      m[0] < 0 ||
      m[0] > 1000000 ||
      m.slice(1, 6).some((n) => !Number.isFinite(n)) ||
      m.slice(1, 5).some((n) => Math.abs(n) > 2) ||
      m[5] <= 0 ||
      m[5] > 0.5 ||
      !/^#[\da-f]{6}$/i.test(m[6]) ||
      !Number.isFinite(m[7]) ||
      m[7] < 0 ||
      m[7] > 1 ||
      !["line", "drop", "wash", "ribbon", "bead"].includes(m[8]) ||
      (m.length === 11 &&
        (!Number.isFinite(m[9]) ||
          m[9] <= 0 ||
          m[9] > 0.5 ||
          !Number.isFinite(m[10]) ||
          Math.abs(m[10]) > 1e9)) ||
      (["ribbon", "bead"].includes(m[8]) && m.length !== 11)
    )
      throw Error("Invalid paint mark in artwork.");
    return [...m];
  });
  return {
    settings: options({ ...d.settings, autoDrip: false }),
    angle: d.angle,
    marks,
  };
}
