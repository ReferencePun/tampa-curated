import { createAnemoneField } from "./engine.js";
import { PRESETS } from "./model.js";
let effects = [],
  running = !matchMedia("(prefers-reduced-motion: reduce)").matches;
const button = document.querySelector("#motion");
function sync() {
  effects.forEach((e) => e.setRunning(running));
  button.textContent = running ? "Pause all" : "Resume all";
}
function mount() {
  effects = [
    createAnemoneField(document.querySelector("#garden")),
    createAnemoneField(document.querySelector("#divider"), {
      ...PRESETS.graphite.settings,
      density: 48,
      length: 1.3,
    }),
    createAnemoneField(document.querySelector("#texture"), {
      ...PRESETS.lilac.settings,
      transparent: true,
      density: 48,
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
