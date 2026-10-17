import { motion, reducedMotion, type Scene } from "./settings";
import { scrollProgress } from "./progress";
export function init(root: HTMLElement): Scene {
  const prints = [
    ...root.querySelectorAll<HTMLElement>("[data-worktable-print]"),
  ];
  const wheels = [...root.querySelectorAll<SVGElement>(".wheel")];
  const rail = root.querySelector<HTMLElement>(".registration-rail i")!;
  const apply = (p: number) => {
    prints.forEach((print, i) => {
      print.style.transform = `translateY(${(1 - p) * motion.worktableTravel[i]}px)`;
    });
    const turn = p * motion.wheelTurns * 360;
    wheels[0].style.transform = `rotate(${turn}deg)`;
    // Opposing absolute angles, 24:16 teeth. A half-tooth phase keeps registration.
    wheels[1].style.transform = `rotate(${(-turn * motion.teeth[0]) / motion.teeth[1] + 11.25}deg)`;
    rail.style.transform = `translateX(${p * 110}px)`;
    root.dataset.progress = p.toFixed(3);
  };
  if (reducedMotion()) {
    prints.forEach((p) => p.style.removeProperty("transform"));
    wheels.forEach((w) => w.style.removeProperty("transform"));
    rail.style.removeProperty("transform");
    return { dispose() {} };
  }
  return { dispose: scrollProgress(root, apply) };
}
