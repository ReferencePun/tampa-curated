import { clamp, motion } from "./settings";
export interface PrintGeometry {
  index: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  scale: number;
  angle: number;
  distance: number;
}
export interface SleeveGeometry {
  width: number;
  height: number;
  printWidth: number;
  printHeight: number;
  step: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export function printGeometry(
  index: number,
  position: number,
  stage: SleeveGeometry,
  reduced = false,
): PrintGeometry {
  const distance = index - position;
  return {
    index,
    cx: stage.width * 0.46 + distance * stage.step,
    cy: stage.height * 0.5,
    width: stage.printWidth,
    height: stage.printHeight,
    scale: reduced
      ? 1
      : 1 - Math.min(Math.abs(distance), 1.6) * motion.neighborScale,
    angle: reduced ? 0 : -clamp(distance, -1, 1) * motion.neighborTilt,
    distance,
  };
}
/** CSS perspective()/rotateY()/scale(), including homogeneous W for texture
 * interpolation. The DOM and WebGL both consume this same geometry. */
export function projectPoint(print: PrintGeometry, x: number, y: number) {
  const angle = (print.angle * Math.PI) / 180;
  const localX = (x - print.width / 2) * print.scale;
  const localY = (y - print.height / 2) * print.scale;
  const depth = -localX * Math.sin(angle);
  const w = 1 - depth / motion.perspective;
  return {
    x: print.cx + (localX * Math.cos(angle)) / w,
    y: print.cy + localY / w,
    w,
  };
}
