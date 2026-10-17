/** Original mechanical geometry. Pitch circles, not the outside tooth tips,
 * determine contact distances and speed ratios. All lengths use SVG units. */
export const TAU = Math.PI * 2;
export const point = (radius: number, angle: number) => [radius * Math.cos(angle), radius * Math.sin(angle)];
const xy = (p: number[]) => p.map(n => n.toFixed(2)).join(' ');

export function gearPath(radius: number, teeth: number) {
  const module = 2 * radius / teeth;
  const root = radius - 1.25 * module;
  const tip = radius + module;
  const base = radius * Math.cos(20 * Math.PI / 180);
  const involute = (r: number) => {
    const alpha = Math.acos(Math.min(1, base / r));
    return Math.tan(alpha) - alpha;
  };
  const half = Math.PI / (2 * teeth) * 0.94; // small tooth clearance
  const points: number[][] = [];
  for (let tooth = 0; tooth < teeth; tooth++) {
    const center = tooth * TAU / teeth;
    points.push(point(root, center - Math.PI / teeth));
    for (const r of [root, Math.max(root, base), radius, tip])
      points.push(point(r, center - half - involute(radius) + involute(Math.max(r, base))));
    for (const r of [tip, radius, Math.max(root, base), root])
      points.push(point(r, center + half + involute(radius) - involute(Math.max(r, base))));
    points.push(point(root, center + Math.PI / teeth));
  }
  return `M${points.map(xy).join('L')}Z`;
}
export function circlePath(r: number) {
  return `M${r} 0A${r} ${r} 0 1 0 ${-r} 0A${r} ${r} 0 1 0 ${r} 0Z`;
}
export function radialMarks(radius: number, count: number, length = 5) {
  return Array.from({length: count}, (_, i) => {
    const a = i * TAU / count;
    return `M${xy(point(radius, a))}L${xy(point(radius + (i % 5 ? length : length * 2), a))}`;
  }).join('');
}
export function meshPhase(parentTeeth: number, childTeeth: number, axisDegrees: number, parentPhase = 0) {
  return axisDegrees + 180 - 180 / childTeeth + parentTeeth / childTeeth * (axisDegrees - parentPhase);
}
export function beltPath(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number, crossed = false) {
  const axis = Math.atan2(y2 - y1, x2 - x1);
  const beta = Math.acos((crossed ? r1 + r2 : r1 - r2) / Math.hypot(x2 - x1, y2 - y1));
  const at = (x: number, y: number, r: number, a: number) => xy([x + r * Math.cos(a), y + r * Math.sin(a)]);
  if (crossed) return `M${at(x1,y1,r1,axis-beta)}L${at(x2,y2,r2,axis-beta+Math.PI)}A${r2} ${r2} 0 1 0 ${at(x2,y2,r2,axis+beta+Math.PI)}L${at(x1,y1,r1,axis+beta)}A${r1} ${r1} 0 1 1 ${at(x1,y1,r1,axis-beta)}Z`;
  return `M${at(x1,y1,r1,axis-beta)}L${at(x2,y2,r2,axis-beta)}A${r2} ${r2} 0 ${r2>r1?1:0} 1 ${at(x2,y2,r2,axis+beta)}L${at(x1,y1,r1,axis+beta)}A${r1} ${r1} 0 ${r1>r2?1:0} 1 ${at(x1,y1,r1,axis-beta)}Z`;
}
export function crankPosition(angle: number, radius: number, rod: number) {
  const theta = angle * Math.PI / 180;
  const x = Math.cos(theta) * radius, y = Math.sin(theta) * radius;
  return {x, y, slider: y + Math.sqrt(rod * rod - x * x)};
}
