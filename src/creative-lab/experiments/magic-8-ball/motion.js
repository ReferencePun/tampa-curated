import { DEFAULTS } from "./answers.js";
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = (x) => {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};
export const ease = (x) => 1 - (1 - clamp(x, 0, 1)) ** 3;
export function options(input = {}) {
  const c = { ...DEFAULTS };
  for (const [k, a, b, step] of [
    ["intensity", 0.3, 2, 0.05],
    ["opacity", 0.1, 0.95, 0.05],
    ["revealSpeed", 0.5, 2, 0.05],
    ["lightAngle", 0, 360, 1],
    ["lighting", 0.4, 1.8, 0.05],
    ["interval", 8, 30, 1],
    ["seed", 1, 9999, 1],
  ])
    if (Number.isFinite(input[k]))
      c[k] = +(Math.round(clamp(input[k], a, b) / step) * step).toFixed(2);
  if (
    typeof input.answerSet === "string" &&
    /^[a-z0-9-]{1,40}$/.test(input.answerSet)
  )
    c.answerSet = input.answerSet;
  if (/^#[\da-f]{6}$/i.test(input.color)) c.color = input.color;
  if (typeof input.autoShake === "boolean") c.autoShake = input.autoShake;
  return c;
}
/** An evaluable motion envelope, independent of frame rate and rendering. */
export function poseAt(time, intensity = 1) {
  const t = clamp(time, 0, 4.8),
    rise = smooth((t - 1.6) / 2.2),
    end = t >= 4.8,
    shake = t < 0.95 ? (1 - smooth(t / 0.95)) * intensity : 0,
    settle = t > 3.8 ? Math.exp(-(t - 3.8) * 5) * Math.sin((t - 3.8) * 11) : 0;
  return {
    phase: end
      ? "answered"
      : t < 0.95
        ? "shaking"
        : t < 1.6
          ? "submerged"
          : t < 3.8
            ? "rising"
            : "settling",
    x: Math.sin(t * 43) * shake * 25,
    y: Math.sin(t * 31 + 0.3) * shake * 13,
    roll: Math.sin(t * 35) * shake * 0.1,
    energy: Math.exp(-t * 0.55) * intensity,
    visibility: smooth((t - 2.15) / 1.5),
    rise,
    faceScale: 0.48 + rise * 0.52,
    faceY: 67 * (1 - rise) + settle * 3,
    faceAngle: (1 - rise) * -0.85 + settle * 0.035,
    tilt: 1.35 * (1 - rise) + settle * 0.08,
    progress: t / 4.8,
  };
}
export class OrbMotion {
  constructor() {
    this.reset();
  }
  reset() {
    this.time = 4.8;
    this.intensity = 1;
    this.started = false;
    this.elapsed = 0;
    this.idle = 0;
  }
  shake(intensity = 1) {
    this.time = 0;
    this.intensity = clamp(intensity, 0.3, 2.6);
    this.started = true;
    this.idle = 0;
  }
  advance(dt, speed = 1, reduced = false) {
    const delta = clamp(dt, 0, 0.1);
    this.elapsed += delta;
    const was = this.time >= 4.8;
    if (this.started && !was) {
      this.time = reduced
        ? 4.8
        : Math.min(4.8, this.time + delta * (this.time < 0.95 ? 1 : speed));
      if (this.time >= 4.8) {
        this.idle = 0;
        return true;
      }
      return false;
    }
    this.idle += delta;
    return false;
  }
  pose() {
    return {
      ...poseAt(this.time, this.intensity),
      phase: !this.started ? "ready" : poseAt(this.time, this.intensity).phase,
    };
  }
  get busy() {
    return this.started && this.time < 4.8;
  }
}
/** Captured pointer distance and direction changes create bounded shake energy. */
export class ShakeGesture {
  constructor(x, y, t) {
    this.start = { x, y };
    this.last = { x, y, t };
    this.distance = 0;
    this.reversals = 0;
    this.previous = 0;
    this.peak = 0;
  }
  add(x, y, t) {
    const dx = x - this.last.x,
      dy = y - this.last.y,
      d = Math.hypot(dx, dy),
      dt = Math.max(8, t - this.last.t);
    this.distance += Math.min(d, 100);
    this.peak = Math.max(this.peak, d / dt);
    const direction = Math.abs(dx) > 2 ? Math.sign(dx) : 0;
    if (direction && this.previous && direction !== this.previous)
      this.reversals++;
    if (direction) this.previous = direction;
    this.last = { x, y, t };
    return this.strength;
  }
  get strength() {
    return clamp(
      0.5 + this.distance / 360 + this.reversals * 0.16 + this.peak * 0.12,
      0.5,
      1.8,
    );
  }
  get dragged() {
    return this.distance > 18;
  }
}
