import { createImpression } from "./renderer.js";
const canvas = document.querySelector("canvas"),
  effect = createImpression(canvas, {
    text: "Paper\nremembers.",
    weight: 400,
    size: 180,
  });
effect.resize(canvas.clientWidth);
const controller = new AbortController(),
  signal = controller.signal;
const observer = new ResizeObserver(() => effect.resize(canvas.clientWidth));
observer.observe(canvas);
canvas.addEventListener(
  "pointermove",
  (e) => {
    const r = canvas.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width - 0.5,
      y = 0.5 - (e.clientY - r.top) / r.height;
    effect.update({
      azimuth: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360,
    });
  },
  { signal },
);
for (const type of ["emboss", "deboss", "letterpress"])
  document
    .getElementById(type)
    .addEventListener("click", () => effect.update({ treatment: type }), {
      signal,
    });
function dispose() {
  controller.abort();
  observer.disconnect();
  effect.dispose();
}
document
  .getElementById("dispose")
  .addEventListener("click", dispose, { signal });
window.addEventListener("pagehide", dispose, { signal });
window.impressionExample = { effect, dispose };
