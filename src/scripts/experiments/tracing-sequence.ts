/** Pure, reversible paper geometry in the archive's coordinate system. */
export const paperWidth = 1613;
export const paperHeight = 1913;
type Point = [number, number];
const rect: Point[] = [[0, 0], [paperWidth, 0], [paperWidth, paperHeight], [0, paperHeight]];
const magnitude = Math.hypot(.82, .57);
export const normal: Point = [.82 / magnitude, .57 / magnitude];
const dot = ([x, y]: Point) => x * normal[0] + y * normal[1];
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const interval = (value: number, start: number, end: number) => clamp01((value - start) / (end - start));
export const pathOf = (points: Point[]) => points.length ? `M${points.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L')}Z` : 'M0 0Z';
function clip(distance: number, front: boolean): Point[] {
 const result: Point[] = [];
 for (let i = 0; i < rect.length; i++) {
  const a = rect[i], b = rect[(i + 1) % rect.length];
  const da = dot(a) - distance, db = dot(b) - distance;
  if (front ? da <= 0 : da >= 0) result.push(a);
  if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
   const t = da / (da - db);
   result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
 }
 return result;
}
export function paperFold(amount: number) {
 const p = clamp01(amount);
 const [nx, ny] = normal;
 const distance = dot([paperWidth, paperHeight]) * (1 - p) - 80 * p;
 const front = clip(distance, true), lifted = clip(distance, false);
 const crease = front.filter(point => Math.abs(dot(point) - distance) < .001);
 const matrix = [1 - 2 * nx * nx, -2 * nx * ny, -2 * nx * ny, 1 - 2 * ny * ny, 2 * distance * nx, 2 * distance * ny];
 const width = 44 * Math.sin(Math.PI * p) ** .5;
 const offset = (point: Point, by: number): Point => [point[0] + nx * by, point[1] + ny * by];
 const a = crease[0], b = crease[crease.length - 1];
 const ribbon = a && b ? [offset(a, -width), offset(b, -width), offset(b, width * .4), offset(a, width * .4)] : [];
 const shadow = a && b ? [offset(a, -width * 1.2), offset(b, -width * 1.2), offset(b, width * 1.8), offset(a, width * 1.8)] : [];
 const midpoint: Point = a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : [0, 0];
 return {front, lifted, matrix, ribbon, shadow, crease: a && b ? [a, b] : [], gradient: [offset(midpoint, -width), offset(midpoint, width * 1.8)]};
}
export function tracingTimeline(progress: number) {
 const p = clamp01(progress), peel = interval(p, .68, .96);
 return {progress:p, ink:interval(p,.04,.60), peel:peel*peel*(3-2*peel), phase:p < .68 ? 0 : p < .96 ? 1 : 2};
}
