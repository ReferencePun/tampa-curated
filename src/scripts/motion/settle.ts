/** Brief frame-rate-independent settling; native scrolling remains the source of truth. */
export function settleProgress(current: number | undefined, target: number, elapsed: number) {
  // Deep links and distant chapter selections should land directly on their destination.
  if (current === undefined || Math.abs(target - current) > .24) return target;
  const next = current + (target - current) * (1 - Math.exp(-Math.min(elapsed, 64) / 58));
  return Math.abs(target - next) < .00002 ? target : next;
}
