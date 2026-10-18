import { createPinField } from "./engine.js";
const canvas = document.querySelector("canvas"),
  abort = new AbortController(),
  signal = abort.signal;
let paused = false,
  visible = true;
const syncRunning = () =>
  field.setRunning(visible && !paused && !document.hidden);
const field = createPinField(
  canvas,
  { density: 64, material: "brass", sample: "blank" },
  (s) => {
    document.querySelector("#status").textContent =
      `${s.count.toLocaleString()} independent rods · ${s.drawCalls} draw calls`;
  },
);
function saddle() {
  field.setProcedural((x, y) => Math.tanh((x * x - y * y) / 12) * 0.8);
}
const observer = new ResizeObserver(() => {
  field.resize(canvas.clientWidth, canvas.clientHeight);
  field.render();
});
observer.observe(canvas);
const visibility = new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting;
  syncRunning();
});
visibility.observe(canvas);
document.querySelector("#saddle").addEventListener("click", saddle, { signal });
document
  .querySelector("#flat")
  .addEventListener("click", () => field.clear(), { signal });
document.querySelector("#pause").addEventListener(
  "click",
  (e) => {
    paused = !paused;
    syncRunning();
    e.target.textContent = paused ? "Resume" : "Pause";
  },
  { signal },
);
document
  .querySelector("input")
  .addEventListener(
    "input",
    (e) => field.update({ rotation: +e.target.value }),
    { signal },
  );
document.addEventListener("visibilitychange", syncRunning, { signal });
saddle();
function dispose() {
  abort.abort();
  observer.disconnect();
  visibility.disconnect();
  field.dispose();
}
window.pinExample = { field, dispose };
window.addEventListener("pagehide", dispose, { once: true });
