export const motion = Object.freeze({
  settleMs: 360,
  foldMs: 420,
  transitionMs: 420,
  worktableTravel: [24, -32, 38],
  wheelTurns: 0.65,
  teeth: [24, 16],
  perspective: 1000,
  neighborTilt: 14,
  neighborScale: 0.16,
  sleeveStep: 0.84,
  momentumMs: 100,
  maxMomentum: 0.28,
  maxDpr: 1.5,
  opticsStrength: 2.2,
  tint: [0.89, 0.19, 0.13] as const,
  qualitySampleFrames: 24,
  maxFrameMs: 25,
  maxDrawMs: 8,
  foldAngle: 180,
  riseClosed: 0,
  riseOpen: -76,
  atlasFoldZoom: 0.32,
  atlasFoldYaw: -14,
});
export const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, n));
export const reducedMotion = () =>
  document.documentElement.dataset.motion === "reduced" ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;
export interface Scene {
  dispose: () => void;
}
