import { clamp } from "./model.js";
/** Sampleable erase choreography; the caller commits the destructive edit once. */
export function erasePose(mode, progress, reduced = false) {
  const p = clamp(progress, 0, 1),
    fade = p * p * (3 - 2 * p);
  return mode === "dial"
    ? {
        x: reduced ? 0 : Math.sin(p * Math.PI * 14) * (1 - p) * 13,
        y: reduced ? 0 : Math.sin(p * Math.PI * 20) * (1 - p) * 4,
        angle: reduced ? 0 : Math.sin(p * Math.PI * 12) * (1 - p) * 2.2,
        opacity: 1 - fade,
        wipe: null,
      }
    : { x: 0, y: 0, angle: 0, opacity: 1, wipe: p };
}
