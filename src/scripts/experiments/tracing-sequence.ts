/** Scroll timing is shared by the ink drawing and the flat sleeve sliding away. */
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const interval = (value: number, start: number, end: number) => clamp01((value - start) / (end - start));
export function tracingTimeline(progress: number) {
 const p = clamp01(progress), slide = interval(p, .68, .96);
 return {progress:p, ink:interval(p,.04,.60), slide:slide*slide*(3-2*slide), phase:p < .68 ? 0 : p < .96 ? 1 : 2};
}
