/** Small, repeatable pen deviations, generated at build time. The drafting
 * paths travel with their mechanical part; they never shimmer or rerandomize. */
const TAU = Math.PI * 2;
const format = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;

export function sketchArc(radius: number, seed = 0, start = 0, end = TAU) {
  const steps = Math.max(8, Math.ceil((end - start) / TAU * 36));
  const wobble = Math.min(.85, radius * .018);
  const points = Array.from({ length: steps + 3 }, (_, i) => {
    const a = start + (end - start) * (i - 1) / steps;
    const r = radius + wobble * (
      .6 * Math.sin(a * 3 + seed) + .35 * Math.sin(a * 7 - seed * .6)
      + .18 * Math.cos(a * 13 + seed * 1.7)
    );
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  let path = `M${format(...points[1] as [number, number])}`;
  for (let i = 1; i <= steps; i++) {
    const [p0, p1, p2, p3] = points.slice(i - 1, i + 3);
    path += `C${format(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)} ${format(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)} ${format(...p2 as [number, number])}`;
  }
  return path;
}

export function sketchLine(x1: number, y1: number, x2: number, y2: number, seed = 0) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length, ny = dx / length;
  const bend = Math.min(.8, length * .018) * Math.sin(seed * 2.7 + 1);
  return `M${format(x1, y1)}C${format(x1 + dx / 3 + nx * bend, y1 + dy / 3 + ny * bend)} ${format(x1 + dx * 2 / 3 - nx * bend, y1 + dy * 2 / 3 - ny * bend)} ${format(x2, y2)}`;
}
