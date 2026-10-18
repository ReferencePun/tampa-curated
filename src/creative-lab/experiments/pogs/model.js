import { DEFAULTS, DISCS, SLAMMERS } from "./catalog.js";
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const ease = (t) => 1 - (1 - clamp(t, 0, 1)) ** 3;
export function options(input = {}) {
  const c = { ...DEFAULTS };
  for (const [k, values] of Object.entries({
    mode: ["practice", "cpu", "collection", "builder"],
    slammer: Object.keys(SLAMMERS),
    surface: ["felt", "wood", "linen"],
    style: ["mixed", "paper", "metal", "holo"],
  }))
    if (values.includes(input[k])) c[k] = input[k];
  for (const [k, a, b, s] of [
    ["stackSize", 1, 16, 1],
    ["power", 0.15, 1, 0.05],
    ["angle", 0, 65, 1],
    ["friction", 0.1, 0.9, 0.05],
  ])
    if (Number.isFinite(input[k]))
      c[k] = +(Math.round(clamp(input[k], a, b) / s) * s).toFixed(2);
  return c;
}
export function hash(seed) {
  let n = seed >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function validateCatalog(catalog) {
  if (
    !Array.isArray(catalog) ||
    !catalog.length ||
    catalog.length > 64 ||
    new Set(catalog.map((c) => c.id)).size !== catalog.length ||
    catalog.some(
      (c) =>
        !c ||
        typeof c.id !== "string" ||
        !/^[a-z0-9-]{1,60}$/.test(c.id) ||
        typeof c.name !== "string" ||
        c.name.length > 90,
    )
  )
    throw Error("Provide 1–64 discs with unique IDs and short names.");
  return catalog;
}
export function validateStack(ids, catalog = DISCS) {
  if (
    !Array.isArray(ids) ||
    ids.length < 1 ||
    ids.length > 16 ||
    ids.some((id) => !catalog.some((c) => c.id === id))
  )
    throw Error("A stack needs 1–16 known disc IDs.");
  return [...ids];
}
/** Fixed impact plan. No random winner selection; final angle determines the face. */
export function planStrike(stack, shot, settings) {
  const c = options(settings),
    slammer = SLAMMERS[c.slammer],
    x = clamp(Number.isFinite(shot.x) ? shot.x : 0, -280, 280),
    y = clamp(Number.isFinite(shot.y) ? shot.y : 0, -200, 250),
    power = clamp(Number.isFinite(shot.power) ? shot.power : c.power, 0.15, 1),
    offset = Math.hypot(x, y),
    reach = slammer.radius + 41;
  const contact = Math.max(0, 1 - (offset / reach) ** 2),
    tilt = (c.angle * Math.PI) / 180,
    surface = { felt: 1.12, wood: 0.82, linen: 1 }[c.surface],
    grip = (0.65 + c.friction * 0.7) * surface;
  const energy =
    (power *
      slammer.mass *
      contact *
      (0.76 + 0.5 * Math.sin(tilt)) *
      (1 + 0.5 * Math.min(1, offset / 45))) /
    grip;
  const axis = Math.atan2(y - 230, x),
    plans = stack.map((disc, i) => {
      const grain = hash(
          (disc.serial + 1) * 137 +
            [...disc.id].reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1), 0),
        ),
        layer = 0.27 + 0.73 * ((i + 1) / stack.length) ** 1.2,
        impulse = energy * layer * (0.82 + grain * 0.36),
        halfTurns = contact > 0 ? Math.max(0, Math.round(impulse * 2.65)) : 0;
      const a = axis + i * 2.399963 + grain * 0.65,
        spread = contact > 0 ? 65 + impulse * 105 + (i % 3) * 21 : 0;
      return {
        ...disc,
        startZ: i * 2.2,
        halfTurns,
        front: halfTurns % 2 === 1,
        angle: halfTurns * Math.PI,
        axis: a + Math.PI / 2,
        yaw: (grain - 0.5) * 1.2,
        peak: contact > 0 ? Math.min(100, 18 + impulse * 82) : 0,
        x: Math.cos(a) * Math.min(265, spread),
        y: Math.sin(a) * Math.min(170, spread),
        delay: 0.32 + (stack.length - i - 1) * 0.012,
        duration: 0.88 + Math.min(0.6, impulse * 0.27),
        impulse,
      };
    });
  // Separate landing footprints. The controlled fan is easier to read than piled-up results.
  if (contact > 0)
    for (let n = 0; n < 22; n++)
      for (let i = 0; i < plans.length; i++)
        for (let j = i + 1; j < plans.length; j++) {
          const a = plans[i],
            b = plans[j],
            dx = b.x - a.x,
            dy = b.y - a.y,
            d = Math.hypot(dx, dy) || 1,
            need = 86;
          if (d < need) {
            const push = (need - d) * 0.52;
            a.x -= (dx / d) * push;
            a.y -= (dy / d) * push;
            b.x += (dx / d) * push;
            b.y += (dy / d) * push;
            a.x = clamp(a.x, -300, 300);
            b.x = clamp(b.x, -300, 300);
            a.y = clamp(a.y, -185, 185);
            b.y = clamp(b.y, -185, 185);
          }
        }
  const duration =
    contact > 0
      ? Math.max(...plans.map((p) => p.delay + p.duration)) + 0.18
      : 0.85;
  return {
    plans,
    x,
    y,
    power,
    energy,
    contact,
    slammer: c.slammer,
    tilt,
    duration,
  };
}
export function sampleDisc(plan, time, hit = true) {
  if (!hit || time < plan.delay)
    return {
      x: 0,
      y: 0,
      z: plan.startZ,
      angle: 0,
      axis: plan.axis,
      yaw: 0,
      front: false,
    };
  const t = clamp((time - plan.delay) / plan.duration, 0, 1),
    travel = ease(t),
    rotation = plan.angle * ease(t) + Math.sin(t * Math.PI) * 0.3,
    edgeHeight = 41 * Math.abs(Math.sin(rotation));
  return {
    x: plan.x * travel,
    y: plan.y * travel,
    z:
      t === 1
        ? 0
        : plan.startZ * (1 - travel) +
          Math.sin(Math.PI * t) * plan.peak +
          edgeHeight,
    angle: t === 1 ? plan.angle : rotation,
    axis: plan.axis,
    yaw: plan.yaw * travel,
    front: plan.front,
  };
}
export class DiscGame {
  constructor(settings = {}, hooks = {}) {
    this.config = options(settings);
    this.catalog = validateCatalog(hooks.catalog || DISCS);
    this.emit = hooks.event || (() => {});
    this.round = 0;
    this.newRound(hooks.stack);
  }
  newRound(ids) {
    this.round++;
    this.turn = 0;
    this.actor = "you";
    this.phase = "ready";
    this.clock = 0;
    this.plan = null;
    this.you = [];
    this.cpu = [];
    this.last = [];
    this.history = [];
    const selected = ids
      ? validateStack(ids, this.catalog)
      : Array.from(
          { length: this.config.stackSize },
          (_, i) =>
            this.catalog[(i + (this.round - 1) * 5) % this.catalog.length].id,
        );
    this.stack = selected.map((id, i) => ({ id, serial: i }));
    this.original = [...selected];
  }
  strike(shot, actor = "you") {
    if (this.phase !== "ready" || this.actor !== actor || !this.stack.length)
      return false;
    this.plan = planStrike(this.stack, shot, this.config);
    this.phase = "flight";
    this.clock = 0;
    this.turn++;
    this.emit({
      type: "strike",
      actor,
      power: this.plan.power,
      contact: this.plan.contact,
    });
    return true;
  }
  collect() {
    if (this.phase !== "result") return false;
    const won = this.plan.plans.filter((p) => p.front && this.plan.contact > 0),
      ids = won.map((p) => p.id);
    this[this.actor].push(...ids);
    this.last = ids;
    this.history.unshift({
      turn: this.turn,
      actor: this.actor,
      ids,
      power: this.plan.power,
      x: this.plan.x,
      y: this.plan.y,
      energy: this.plan.energy,
    });
    this.history.length = Math.min(40, this.history.length);
    this.phase = "restack";
    this.clock = 0;
    this.emit({ type: "collect", actor: this.actor, ids });
    return true;
  }
  advance(dt) {
    if (
      !Number.isFinite(dt) ||
      dt <= 0 ||
      !["flight", "restack", "thinking", "result"].includes(this.phase)
    )
      return;
    this.clock += dt;
    if (this.phase === "flight" && this.clock >= this.plan.duration) {
      this.phase = "result";
      this.clock = 0;
      this.emit({
        type: "land",
        actor: this.actor,
        count: this.plan.plans.filter((p) => p.front && this.plan.contact > 0)
          .length,
        miss: !this.plan.contact,
      });
    } else if (
      this.phase === "result" &&
      this.actor === "cpu" &&
      this.clock >= 1.6
    )
      this.collect();
    else if (this.phase === "restack" && this.clock >= 0.72) {
      this.stack = this.plan.plans
        .filter((p) => !p.front || this.plan.contact === 0)
        .map((p) => ({ id: p.id, serial: p.serial }));
      this.plan = null;
      this.clock = 0;
      if (!this.stack.length) {
        this.phase = "complete";
        this.emit({
          type: "complete",
          you: this.you.length,
          cpu: this.cpu.length,
        });
      } else if (this.config.mode === "cpu" && this.actor === "you") {
        this.actor = "cpu";
        this.phase = "thinking";
        this.emit({ type: "thinking" });
      } else {
        this.actor = "you";
        this.phase = "ready";
        this.emit({ type: "ready" });
      }
    } else if (this.phase === "thinking" && this.clock >= 1.1) {
      this.phase = "ready";
      const h = hash(this.turn * 731 + this.round * 97);
      this.strike(
        {
          x: 12 + (h - 0.5) * 30,
          y: -4 + (hash(this.turn * 13) - 0.5) * 24,
          power: 0.5 + hash(this.turn * 127) * 0.42,
        },
        "cpu",
      );
    }
  }
  poses() {
    if (!this.plan)
      return this.stack.map((p, i) => ({
        ...p,
        x: 0,
        y: 0,
        z: i * 2.2,
        angle: 0,
        axis: 0,
        yaw: 0,
        front: false,
        alpha: 1,
      }));
    return this.plan.plans.map((p, i) => {
      let pose = sampleDisc(
          p,
          this.phase === "flight" ? this.clock : this.plan.duration,
          this.plan.contact > 0,
        ),
        alpha = 1;
      if (this.phase === "restack") {
        const t = ease(this.clock / 0.72);
        if (p.front && this.plan.contact > 0) {
          pose.x += ((this.actor === "you" ? -365 : 365) - pose.x) * t;
          pose.y += (225 - pose.y) * t;
          pose.z += Math.sin(t * Math.PI) * 55;
          alpha = 1 - t;
        } else {
          const index = this.plan.plans
            .slice(0, i)
            .filter((q) => !q.front || this.plan.contact === 0).length;
          pose = {
            ...pose,
            x: pose.x * (1 - t),
            y: pose.y * (1 - t),
            z: pose.z * (1 - t) + index * 2.2 * t,
            angle: pose.angle,
            yaw: pose.yaw * (1 - t),
          };
        }
      }
      return { ...p, ...pose, alpha };
    });
  }
  state() {
    return {
      phase: this.phase,
      actor: this.actor,
      turn: this.turn,
      round: this.round,
      left:
        this.stack.length - (this.phase === "restack" ? this.last.length : 0),
      you: this.you.length,
      cpu: this.cpu.length,
      pending:
        this.phase === "result"
          ? this.plan.plans.filter((p) => p.front && this.plan.contact > 0)
              .length
          : 0,
      count: this.original.length,
      clock: this.clock,
    };
  }
}
export function parseAlbum(doc, catalog = DISCS) {
  if (
    !doc ||
    doc.type !== "odd-company-album" ||
    doc.version !== 1 ||
    !doc.counts ||
    Array.isArray(doc.counts) ||
    typeof doc.counts !== "object"
  )
    throw Error("Choose an Odd Company album JSON file.");
  const counts = {};
  for (const [id, n] of Object.entries(doc.counts)) {
    if (
      !catalog.some((c) => c.id === id) ||
      !Number.isInteger(n) ||
      n < 0 ||
      n > 99999
    )
      throw Error("The album contains an invalid disc or count.");
    if (n) counts[id] = n;
  }
  return counts;
}
