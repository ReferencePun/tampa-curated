import { createJellyfishTank } from "./engine.js";
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
    createJellyfishTank(document.querySelector("#tank"), { mode: "light" }),
    createJellyfishTank(document.querySelector("#crop"), {
      ...PRESETS.orchid.settings,
      view: "open",
      count: 5,
      zoom: 1.3,
      quality: "economy",
    }),
    createJellyfishTank(document.querySelector("#hero"), {
      ...PRESETS.quiet.settings,
      palette: "moon",
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
