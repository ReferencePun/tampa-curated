export const DEFAULTS = Object.freeze({
  mode: "pointer",
  density: 80,
  pinLength: 2.5,
  boardDepth: 0.65,
  strength: 0.85,
  radius: 1.2,
  material: "steel",
  spring: 1.1,
  light: 135,
  smoothing: 0.3,
  autoWave: false,
  hold: true,
  direction: "out",
  shape: "sphere",
  sample: "orbit",
  wave: "ripple",
  waveSpeed: 0.65,
  phase: 0,
  rotation: -20,
  tilt: 24,
  zoom: 1,
  invert: false,
});
export const PRESETS = {
  silver: { name: "Silver / soft contact", settings: { ...DEFAULTS } },
  brass: {
    name: "Brass / palm study",
    settings: {
      ...DEFAULTS,
      mode: "image",
      sample: "palm",
      material: "brass",
      strength: 0.95,
      pinLength: 3,
      rotation: 22,
    },
  },
  sea: {
    name: "Sea glass / moving tide",
    settings: {
      ...DEFAULTS,
      mode: "wave",
      sample: "blank",
      material: "resin",
      wave: "tide",
      autoWave: true,
      strength: 0.65,
    },
  },
  graphite: {
    name: "Graphite / negative space",
    settings: {
      ...DEFAULTS,
      mode: "stamp",
      sample: "blank",
      material: "graphite",
      direction: "in",
      shape: "ring",
      radius: 2,
      smoothing: 0.15,
    },
  },
};
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ranges = {
  density: [32, 128],
  pinLength: [1.2, 3.6],
  boardDepth: [0.15, 1],
  strength: [0.1, 1],
  radius: [0.35, 2.8],
  spring: [0.25, 3],
  light: [0, 360],
  smoothing: [0, 1],
  waveSpeed: [0.15, 2],
  phase: [0, 100],
  rotation: [-65, 65],
  tilt: [-50, 55],
  zoom: [0.7, 1.8],
};
const choices = {
  mode: ["pointer", "stamp", "image", "wave"],
  material: ["steel", "brass", "graphite", "resin"],
  direction: ["in", "out"],
  shape: ["sphere", "cube", "ring", "star"],
  sample: ["blank", "orbit", "palm", "landscape"],
  wave: ["ripple", "tide", "interference"],
};
const increments = {
  density: 1,
  pinLength: 0.05,
  boardDepth: 0.05,
  strength: 0.01,
  radius: 0.05,
  spring: 0.05,
  light: 1,
  smoothing: 0.05,
  waveSpeed: 0.05,
  phase: 0.1,
  rotation: 0.1,
  tilt: 0.1,
  zoom: 0.05,
};
export function options(v = {}) {
  const out = { ...DEFAULTS };
  for (const [key, [a, b]] of Object.entries(ranges))
    if (Number.isFinite(+v[key])) {
      const step = increments[key];
      out[key] = +clamp(
        a + Math.round((clamp(+v[key], a, b) - a) / step) * step,
        a,
        b,
      ).toFixed(4);
    }
  out.density = Math.round(out.density);
  for (const [key, list] of Object.entries(choices))
    if (list.includes(v[key])) out[key] = v[key];
  for (const key of ["autoWave", "hold", "invert"])
    if (typeof v[key] === "boolean") out[key] = v[key];
  return out;
}
export function gridFor(columns = 80) {
  const rows = Math.round((columns * 2) / 3),
    width = 12,
    height = 8;
  const x = new Float32Array(columns * rows),
    y = new Float32Array(columns * rows);
  for (let i = 0; i < x.length; i++) {
    x[i] = (((i % columns) + 0.5) / columns - 0.5) * width;
    y[i] = (0.5 - (Math.floor(i / columns) + 0.5) / rows) * height;
  }
  return {
    columns,
    rows,
    count: columns * rows,
    width,
    height,
    pitch: width / columns,
    x,
    y,
  };
}
export function travelFor(settings) {
  return Math.max(0.005, (settings.pinLength - settings.boardDepth) / 2 - 0.09);
}
export function position(grid, index) {
  return [
    (((index % grid.columns) + 0.5) / grid.columns - 0.5) * grid.width,
    (0.5 - (Math.floor(index / grid.columns) + 0.5) / grid.rows) * grid.height,
  ];
}
export function sampleGrid(data, columns, rows, u, v) {
  const x = clamp(u * columns - 0.5, 0, columns - 1),
    y = clamp(v * rows - 0.5, 0, rows - 1),
    a = Math.floor(x),
    b = Math.floor(y),
    fx = x - a,
    fy = y - b;
  const p =
      data[b * columns + a] * (1 - fx) +
      data[b * columns + Math.min(a + 1, columns - 1)] * fx,
    q =
      data[Math.min(b + 1, rows - 1) * columns + a] * (1 - fx) +
      data[Math.min(b + 1, rows - 1) * columns + Math.min(a + 1, columns - 1)] *
        fx;
  return p * (1 - fy) + q * fy;
}
function segmentDistance(x, y, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    t = clamp(
      ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1),
      0,
      1,
    );
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
}
export function shapeHeight(shape, x, y) {
  const d = Math.hypot(x, y);
  if (shape === "sphere") return d < 1 ? Math.sqrt(1 - d * d) : 0;
  if (shape === "cube") {
    const q = Math.max(Math.abs(x), Math.abs(y));
    return clamp((1 - q) / 0.12, 0, 1);
  }
  if (shape === "ring") {
    const q = (d - 0.64) / 0.27;
    return Math.abs(q) < 1 ? Math.sqrt(1 - q * q) : 0;
  }
  const a = Math.atan2(y, x),
    edge = 0.7 + 0.25 * Math.cos(5 * a - Math.PI / 2);
  return clamp((edge - d) / 0.12, 0, 1);
}
export function sampleHeight(id, x, y) {
  if (id === "blank") return 0;
  if (id === "orbit") {
    const d = Math.hypot(x * 0.9, y);
    return (
      0.85 * Math.exp(-Math.pow((d - 2.25) / 0.42, 2)) +
      0.45 * Math.exp(-(x * x + y * y) / 1.1)
    );
  }
  if (id === "landscape")
    return (
      0.64 *
        Math.exp(-Math.pow((y - Math.sin(x * 0.8) * 0.8) / 1.2, 2)) *
        (0.65 + 0.35 * Math.cos(x * 0.5)) -
      0.2 * Math.exp(-Math.pow((y + 2) / 0.8, 2))
    );
  const fingers = [
    [-1.15, 0.6, -1.5, 2.65, 0.38],
    [-0.45, 0.9, -0.55, 3.2, 0.4],
    [0.3, 0.9, 0.4, 2.95, 0.38],
    [0.95, 0.6, 1.2, 2.35, 0.33],
    [-1.25, -0.6, -2.25, 0.45, 0.48],
  ];
  let h =
    0.75 * Math.sqrt(Math.max(0, 1 - (x / 1.55) ** 2 - ((y + 0.6) / 1.8) ** 2));
  for (const [ax, ay, bx, by, r] of fingers) {
    const d = segmentDistance(x, y, [ax, ay], [bx, by]) / r;
    h = Math.max(h, 0.76 * Math.sqrt(Math.max(0, 1 - d * d)));
  }
  if (y < -1 && y > -3.45)
    h = Math.max(
      h,
      0.64 *
        Math.sqrt(Math.max(0, 1 - (x / 0.9) ** 2)) *
        clamp((y + 3.45) / 0.4, 0, 1),
    );
  return h;
}
export function waveHeight(kind, x, y, time) {
  if (kind === "tide") return Math.sin(x * 0.9 + y * 0.35 - time) * 0.68;
  if (kind === "interference")
    return Math.sin(x * 1.1 + time) * Math.cos(y * 1.3 - time * 0.7) * 0.7;
  const d = Math.hypot(x, y);
  return Math.sin(d * 1.8 - time * 1.5) * 0.75 * Math.exp(-d * 0.055);
}
export class PinFieldState {
  constructor(settings = {}) {
    this.settings = options(settings);
    this.grid = gridFor(this.settings.density);
    this.raw = new Float32Array(this.grid.count);
    this.heights = new Float32Array(this.grid.count);
    this.velocity = new Float32Array(this.grid.count);
    this.goal = new Float32Array(this.grid.count);
    this.temp = new Float32Array(this.grid.count);
    this.phase = (this.settings.phase / 100) * Math.PI * 2;
    this.contact = null;
    this.revision = 0;
    this.setSample(this.settings.sample);
    this.snap();
  }
  update(next) {
    const previous = this.settings;
    this.settings = options({ ...previous, ...next });
    if (previous.density !== this.settings.density) {
      const old = this.grid,
        raw = this.raw,
        heights = this.heights;
      this.grid = gridFor(this.settings.density);
      this.raw = new Float32Array(this.grid.count);
      this.heights = new Float32Array(this.grid.count);
      this.velocity = new Float32Array(this.grid.count);
      this.goal = new Float32Array(this.grid.count);
      this.temp = new Float32Array(this.grid.count);
      for (let i = 0; i < this.grid.count; i++) {
        const u = ((i % this.grid.columns) + 0.5) / this.grid.columns,
          v = (Math.floor(i / this.grid.columns) + 0.5) / this.grid.rows;
        this.raw[i] = sampleGrid(raw, old.columns, old.rows, u, v);
        this.heights[i] = sampleGrid(heights, old.columns, old.rows, u, v);
      }
      this.revision++;
    }
    if (previous.phase !== this.settings.phase)
      this.phase = (this.settings.phase / 100) * Math.PI * 2;
    if (previous.sample !== this.settings.sample)
      this.setSample(this.settings.sample);
    else this.targets();
  }
  setProcedural(fn) {
    for (let i = 0; i < this.grid.count; i++) {
      const x = this.grid.x[i],
        y = this.grid.y[i],
        v = fn(x, y, i);
      this.raw[i] = Number.isFinite(v) ? clamp(v, -1, 1) : 0;
    }
    this.contact = null;
    this.targets();
  }
  setSample(id) {
    this.setProcedural((x, y) => sampleHeight(id, x, y));
  }
  setHeightMap(map, { invert = false } = {}) {
    if (
      !map ||
      !Number.isInteger(map.width) ||
      !Number.isInteger(map.height) ||
      map.width < 1 ||
      map.height < 1 ||
      map.width * map.height !== map.data?.length ||
      map.data.length > 1048576
    )
      throw Error("Supply a valid height map up to one million samples.");
    for (const v of map.data)
      if (!Number.isFinite(v) || v < 0 || v > 1)
        throw Error("Height maps must contain values from zero to one.");
    const ratio = map.width / map.height,
      fitWidth = Math.min(1, ratio / 1.5),
      fitHeight = Math.min(1, 1.5 / ratio);
    this.setProcedural((x, y) => {
      const u = x / 12 + 0.5,
        v = 0.5 - y / 8,
        mu = (u - 0.5) / fitWidth + 0.5,
        mv = (v - 0.5) / fitHeight + 0.5;
      if (mu < 0 || mu > 1 || mv < 0 || mv > 1) return 0;
      const h = sampleGrid(map.data, map.width, map.height, mu, mv);
      return invert ? 1 - h : h;
    });
  }
  press(
    point,
    from = point,
    shape = this.settings.mode === "stamp" ? this.settings.shape : "sphere",
    pressure = 1,
  ) {
    const s = this.settings,
      r = s.radius,
      sign = s.direction === "out" ? 1 : -1;
    this.contact = { point: [...point], shape, pressure };
    if (s.hold) {
      const length = Math.hypot(point[0] - from[0], point[1] - from[1]),
        steps = clamp(Math.ceil(length / (r * 0.28)), 1, 40);
      for (let j = 0; j <= steps; j++) {
        const center = [
          from[0] + ((point[0] - from[0]) * j) / steps,
          from[1] + ((point[1] - from[1]) * j) / steps,
        ];
        for (let i = 0; i < this.grid.count; i++) {
          const x = this.grid.x[i],
            y = this.grid.y[i];
          if (Math.abs(x - center[0]) > r || Math.abs(y - center[1]) > r)
            continue;
          const h =
            shapeHeight(shape, (x - center[0]) / r, (y - center[1]) / r) *
            pressure;
          if (h > 0)
            this.raw[i] =
              sign > 0 ? Math.max(this.raw[i], h) : Math.min(this.raw[i], -h);
        }
      }
    }
    this.targets();
  }
  releasePointer() {
    this.contact = null;
    this.targets();
  }
  clear() {
    this.raw.fill(0);
    this.contact = null;
    this.targets();
  }
  targets() {
    const { settings: s, grid: g } = this;
    const wave = s.mode === "wave" || s.autoWave;
    for (let i = 0; i < g.count; i++) {
      const x = g.x[i],
        y = g.y[i];
      let h = this.raw[i];
      if (this.contact && !s.hold) {
        const c = this.contact,
          q =
            shapeHeight(
              c.shape,
              (x - c.point[0]) / s.radius,
              (y - c.point[1]) / s.radius,
            ) * c.pressure;
        if (q > 0) h = s.direction === "out" ? Math.max(h, q) : Math.min(h, -q);
      }
      if (wave) h = h * 0.45 + waveHeight(s.wave, x, y, this.phase);
      this.temp[i] = clamp(h * s.strength, -1, 1);
    }
    const a = s.smoothing * 0.78;
    for (let i = 0; i < g.count; i++) {
      const c = i % g.columns,
        r = Math.floor(i / g.columns),
        average =
          (this.temp[c ? i - 1 : i] +
            this.temp[c < g.columns - 1 ? i + 1 : i] +
            this.temp[r ? i - g.columns : i] +
            this.temp[r < g.rows - 1 ? i + g.columns : i]) /
          4;
      this.goal[i] = this.temp[i] * (1 - a) + average * a;
    }
  }
  step(dt) {
    dt = clamp(dt, 0, 0.06);
    if (this.settings.autoWave) {
      this.phase += dt * this.settings.waveSpeed;
      this.targets();
    }
    const omega = 4 + this.settings.spring * 8,
      decay = Math.exp(-omega * dt);
    let active = false;
    for (let i = 0; i < this.grid.count; i++) {
      const x = this.heights[i] - this.goal[i],
        v = this.velocity[i],
        k = v + omega * x,
        next = this.goal[i] + (x + k * dt) * decay;
      this.heights[i] = clamp(next, -1, 1);
      this.velocity[i] = (v - omega * k * dt) * decay;
      if (Math.abs(x) > 0.00015 || Math.abs(v) > 0.0003) active = true;
      else {
        this.heights[i] = this.goal[i];
        this.velocity[i] = 0;
      }
    }
    if (active || this.settings.autoWave) this.revision++;
    return active || this.settings.autoWave;
  }
  snap() {
    this.heights.set(this.goal);
    this.velocity.fill(0);
    this.revision++;
  }
  valueAt(x, y) {
    return sampleGrid(
      this.heights,
      this.grid.columns,
      this.grid.rows,
      x / 12 + 0.5,
      0.5 - y / 8,
    );
  }
  statistics() {
    let min = 1,
      max = -1,
      mean = 0,
      energy = 0,
      moved = 0;
    for (const h of this.heights) {
      min = Math.min(min, h);
      max = Math.max(max, h);
      mean += h;
      energy += Math.abs(h);
      if (Math.abs(h) > 0.015) moved++;
    }
    return {
      count: this.grid.count,
      min,
      max,
      mean: mean / this.grid.count,
      energy: energy / this.grid.count,
      moved,
      phase: this.phase,
      revision: this.revision,
    };
  }
  serialize() {
    return {
      version: 1,
      kind: "pin-field",
      columns: this.grid.columns,
      rows: this.grid.rows,
      values: Array.from(this.heights),
      settings: {
        ...this.settings,
        mode: "pointer",
        autoWave: false,
        strength: 1,
        smoothing: 0,
        sample: "blank",
        invert: false,
      },
    };
  }
  load(value) {
    const doc = readField(value);
    this.update(doc.settings);
    if (this.grid.columns === doc.columns && this.grid.rows === doc.rows) {
      // Preserve the exact sculpture when no resampling is needed.
      this.raw.set(doc.values);
      this.contact = null;
      this.targets();
    } else {
      this.setProcedural((x, y) =>
        sampleGrid(
          doc.values,
          doc.columns,
          doc.rows,
          x / 12 + 0.5,
          0.5 - y / 8,
        ),
      );
    }
    this.snap();
  }
  dispose() {
    this.raw =
      this.heights =
      this.velocity =
      this.goal =
      this.temp =
        new Float32Array();
    this.contact = null;
  }
}
export function readField(doc) {
  if (
    !doc ||
    doc.version !== 1 ||
    doc.kind !== "pin-field" ||
    !Number.isInteger(doc.columns) ||
    !Number.isInteger(doc.rows) ||
    doc.columns < 2 ||
    doc.rows < 2 ||
    doc.columns * doc.rows > 16384 ||
    !Array.isArray(doc.values) ||
    doc.values.length !== doc.columns * doc.rows ||
    doc.values.some((v) => !Number.isFinite(v) || v < -1 || v > 1)
  )
    throw Error(
      "Choose a valid version 1 pin-field JSON, with at most 16,384 heights.",
    );
  return {
    ...doc,
    settings: options({ ...doc.settings, density: doc.columns }),
    values: Float32Array.from(doc.values),
  };
}
