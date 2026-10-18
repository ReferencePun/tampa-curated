/** Browser-independent precision game. Coordinates are in board units. */
export const DEFAULTS = {
  mode: "classic",
  difficulty: "steady",
  tolerance: 2,
  timer: 90,
  objectCount: 6,
  objectSize: 1,
  boardStyle: "sage",
  sound: false,
  sensitivity: 1,
};
export const PRESETS = {
  afternoon: { name: "A steady afternoon", settings: { ...DEFAULTS } },
  first: {
    name: "First appointment",
    settings: {
      ...DEFAULTS,
      difficulty: "gentle",
      objectCount: 3,
      tolerance: 0,
      objectSize: 0.8,
    },
  },
  precision: {
    name: "Three strikes",
    settings: {
      ...DEFAULTS,
      mode: "precision",
      difficulty: "expert",
      tolerance: 3,
    },
  },
  rush: {
    name: "The 90-second shift",
    settings: { ...DEFAULTS, mode: "timed", boardStyle: "coral" },
  },
  odd: {
    name: "A peculiar diagnosis",
    settings: { ...DEFAULTS, mode: "silly", boardStyle: "blue" },
  },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function options(input = {}) {
  const c = { ...DEFAULTS };
  for (const [k, vals] of Object.entries({
    mode: ["classic", "timed", "precision", "silly"],
    difficulty: ["gentle", "steady", "expert"],
    boardStyle: ["sage", "coral", "blue"],
  }))
    if (vals.includes(input[k])) c[k] = input[k];
  for (const [k, a, b, step] of [
    ["tolerance", 0, 5, 0.5],
    ["timer", 30, 180, 5],
    ["objectCount", 1, 6, 1],
    ["objectSize", 0.7, 1.25, 0.05],
    ["sensitivity", 0.4, 1.5, 0.05],
  ])
    if (Number.isFinite(input[k]))
      c[k] = Number(
        (Math.round(clamp(input[k], a, b) / step) * step).toFixed(2),
      );
  c.sound = input.sound === true;
  return c;
}
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function pointSegment(p, a, b) {
  const x = b.x - a.x,
    y = b.y - a.y,
    d = x * x + y * y,
    t = d ? clamp(((p.x - a.x) * x + (p.y - a.y) * y) / d, 0, 1) : 0;
  return distance(p, { x: a.x + t * x, y: a.y + t * y });
}
export function contains(poly, p) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
export function segmentDistance(a, b, c, d) {
  if (
    cross(a, b, c) * cross(a, b, d) < 0 &&
    cross(c, d, a) * cross(c, d, b) < 0
  )
    return 0;
  return Math.min(
    pointSegment(a, c, d),
    pointSegment(b, c, d),
    pointSegment(c, a, b),
    pointSegment(d, a, b),
  );
}
/** Swept disk vs every polygon edge, not merely the last pointer sample. */
export function sweptSafe(poly, a, b, radius) {
  if (!contains(poly, a) || !contains(poly, b)) return false;
  for (let i = 0; i < poly.length; i++)
    if (
      segmentDistance(a, b, poly[i], poly[(i + 1) % poly.length]) <
      radius - 1e-7
    )
      return false;
  return true;
}
/** Mitered channel with circular end caps. Use non-self-intersecting paths. */
export function channelPolygon(path, width) {
  const r = width / 2,
    normals = path.slice(1).map((p, i) => {
      const a = path[i],
        d = distance(a, p);
      return { x: -(p.y - a.y) / d, y: (p.x - a.x) / d };
    });
  const side = (sign) =>
    path.map((p, i) => {
      const a = normals[Math.max(0, i - 1)],
        b = normals[Math.min(normals.length - 1, i)],
        nx = a.x + b.x,
        ny = a.y + b.y,
        d = nx * b.x + ny * b.y;
      return { x: p.x + (sign * r * nx) / d, y: p.y + (sign * r * ny) / d };
    });
  const left = side(1),
    right = side(-1),
    end = path.at(-1),
    start = path[0],
    endAngle = Math.atan2(normals.at(-1).y, normals.at(-1).x),
    startAngle = Math.atan2(-normals[0].y, -normals[0].x),
    poly = [...left];
  for (let i = 1; i <= 16; i++) {
    const a = endAngle - (i * Math.PI) / 16;
    poly.push({ x: end.x + Math.cos(a) * r, y: end.y + Math.sin(a) * r });
  }
  poly.push(...right.reverse().slice(1));
  for (let i = 1; i <= 16; i++) {
    const a = startAngle - (i * Math.PI) / 16;
    poly.push({ x: start.x + Math.cos(a) * r, y: start.y + Math.sin(a) * r });
  }
  return poly;
}
function point(p) {
  return (
    p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    Math.abs(p.x) < 10000 &&
    Math.abs(p.y) < 10000
  );
}
export function validateScene(scene) {
  if (
    !scene ||
    !Number.isFinite(scene.width) ||
    !Number.isFinite(scene.height) ||
    scene.width < 100 ||
    scene.height < 100 ||
    scene.width > 4000 ||
    scene.height > 4000 ||
    !Array.isArray(scene.cavities) ||
    !scene.cavities.length ||
    scene.cavities.length > 24
  )
    throw Error("A board needs dimensions and 1–24 cavities.");
  const ids = new Set();
  for (const c of scene.cavities) {
    if (
      typeof c.id !== "string" ||
      ids.has(c.id) ||
      !c.polygon ||
      c.polygon.length < 3 ||
      c.polygon.length > 512 ||
      !c.polygon.every(point) ||
      !point(c.start) ||
      !point(c.exit) ||
      !Number.isFinite(c.radius) ||
      c.radius < 2 ||
      c.radius > 50 ||
      !Number.isFinite(c.exitRadius) ||
      c.exitRadius < 2
    )
      throw Error("Invalid cavity definition.");
    ids.add(c.id);
    if (
      !sweptSafe(c.polygon, c.start, c.start, c.radius) ||
      !sweptSafe(c.polygon, c.exit, c.exit, c.radius)
    )
      throw Error("Pieces and exits must fit inside their cavities.");
    for (let i = 0; i < c.polygon.length; i++)
      for (let j = i + 2; j < c.polygon.length; j++) {
        if (i === 0 && j === c.polygon.length - 1) continue;
        const a = c.polygon[i],
          b = c.polygon[(i + 1) % c.polygon.length],
          d = c.polygon[j],
          e = c.polygon[(j + 1) % c.polygon.length];
        if (
          cross(a, b, d) * cross(a, b, e) < 0 &&
          cross(d, e, a) * cross(d, e, b) < 0
        )
          throw Error("Cavity polygons must not self-intersect.");
      }
  }
  if (scene.rules) {
    for (const k of ["points", "penalty", "strikes"])
      if (
        scene.rules[k] !== undefined &&
        (!Number.isFinite(scene.rules[k]) ||
          scene.rules[k] < 0 ||
          scene.rules[k] > 10000)
      )
        throw Error("Invalid scoring rule.");
  }
  return scene;
}
export class PrecisionGame {
  constructor(scene, settings = {}, emit = () => {}) {
    this.scene = validateScene(scene);
    this.config = options(settings);
    this.emit = emit;
    this.reset();
  }
  reset(scene = this.scene) {
    this.scene = validateScene(scene);
    this.pieces = scene.cavities.map((c) => ({
      id: c.id,
      x: c.start.x,
      y: c.start.y,
      removed: false,
    }));
    this.active = null;
    this.elapsed = 0;
    this.score = 0;
    this.faults = 0;
    this.successes = 0;
    this.log = [];
    this.flash = 0;
    this.celebration = 0;
    this.status = this.config.mode === "timed" ? "ready" : "playing";
  }
  radius(c) {
    return (
      c.radius * this.config.objectSize +
      this.config.tolerance +
      (this.config.mode === "precision" ? 1 : 0)
    );
  }
  get remaining() {
    return Math.max(0, this.config.timer - this.elapsed);
  }
  get limit() {
    return this.config.mode === "precision"
      ? (this.scene.rules?.strikes ?? 3)
      : Infinity;
  }
  start() {
    if (this.status === "ready") {
      this.status = "playing";
      this.emit({ type: "start" });
    }
  }
  begin(p) {
    if (!point(p) || this.active !== null || this.status !== "playing")
      return false;
    const i = this.pieces.findIndex(
      (piece, i) =>
        !piece.removed &&
        distance(piece, p) <=
          Math.max(13, this.radius(this.scene.cavities[i]) + 3),
    );
    if (i < 0) return false;
    const c = this.scene.cavities[i],
      piece = this.pieces[i];
    // Grip locks to the piece center: the initial click never penalizes a touch hit area.
    this.active = i;
    this.grip = { x: piece.x - p.x, y: piece.y - p.y };
    this.emit({ type: "grab", id: c.id });
    return true;
  }
  move(p) {
    if (this.active === null || !point(p)) return false;
    const i = this.active,
      c = this.scene.cavities[i],
      piece = this.pieces[i],
      next = { x: p.x + this.grip.x, y: p.y + this.grip.y };
    if (!sweptSafe(c.polygon, piece, next, this.radius(c))) {
      const from = { x: piece.x, y: piece.y };
      let lo = 0,
        hi = 1;
      for (let n = 0; n < 18; n++) {
        const t = (lo + hi) / 2,
          q = {
            x: from.x + (next.x - from.x) * t,
            y: from.y + (next.y - from.y) * t,
          };
        if (sweptSafe(c.polygon, from, q, this.radius(c))) lo = t;
        else hi = t;
      }
      this.contact = {
        x: from.x + (next.x - from.x) * lo,
        y: from.y + (next.y - from.y) * lo,
      };
      piece.x = c.start.x;
      piece.y = c.start.y;
      this.active = null;
      this.faults++;
      this.score = Math.max(0, this.score - (this.scene.rules?.penalty ?? 25));
      this.flash = 0.55;
      if (this.faults >= this.limit) this.status = "failed";
      this.log.unshift({
        type: "contact",
        id: c.id,
        time: this.elapsed,
        score: this.score,
      });
      this.log.length = Math.min(40, this.log.length);
      this.emit({
        type: "contact",
        id: c.id,
        finished: this.status === "failed",
      });
      return false;
    }
    piece.x = next.x;
    piece.y = next.y;
    return true;
  }
  end(cancel = false) {
    if (this.active === null) return false;
    const i = this.active,
      c = this.scene.cavities[i],
      p = this.pieces[i];
    this.active = null;
    if (!cancel && distance(p, c.exit) <= c.exitRadius) {
      p.removed = true;
      this.score += this.scene.rules?.points ?? 100;
      this.successes++;
      this.celebration = 0.7;
      if (this.successes === this.pieces.length) this.status = "complete";
      this.log.unshift({
        type: "extracted",
        id: c.id,
        time: this.elapsed,
        score: this.score,
      });
      this.log.length = Math.min(40, this.log.length);
      this.emit({
        type: "extracted",
        id: c.id,
        complete: this.status === "complete",
      });
      return true;
    }
    p.x = c.start.x;
    p.y = c.start.y;
    this.emit({ type: "returned", id: c.id, cancel });
    return false;
  }
  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0) return;
    this.flash = Math.max(0, this.flash - dt);
    this.celebration = Math.max(0, this.celebration - dt);
    if (this.status === "playing") {
      this.elapsed += dt;
      if (this.config.mode === "timed" && this.remaining === 0) {
        this.end(true);
        this.status = "finished";
        this.emit({ type: "time" });
      }
    }
  }
  state() {
    return {
      status: this.status,
      score: this.score,
      faults: this.faults,
      successes: this.successes,
      count: this.pieces.length,
      remaining: this.remaining,
      elapsed: this.elapsed,
      active: this.active,
    };
  }
}
