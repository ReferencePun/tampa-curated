import { createLavaLamp } from "./engine.js";
let effects = [],
  running = !matchMedia("(prefers-reduced-motion: reduce)").matches;
const button = document.querySelector("#motion");
function sync() {
  effects.forEach((e) => e.setRunning(running));
  button.textContent = running ? "Pause all" : "Resume all";
}
function mount() {
  effects = [
    createLavaLamp(document.querySelector("#lamp")),
    createLavaLamp(document.querySelector("#column"), {
      mode: "column",
      palette: "pearl",
      blobs: 9,
    }),
    createLavaLamp(document.querySelector("#ambient"), {
      mode: "ambient",
      palette: "orchid",
      blobs: 18,
      speed: 0.6,
    }),
  ];
  sync();
}
button.onclick = () => {
  running = !running;
  sync();
};
window.addEventListener("pagehide", () => {
  effects.forEach((e) => e.dispose());
  effects = [];
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted && !effects.length) mount();
});
mount();
