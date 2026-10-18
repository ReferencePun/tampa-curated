import { createPlasmaBall } from "./engine.js";
let engines = [],
  running = !matchMedia("(prefers-reduced-motion: reduce)").matches;
const button = document.querySelector("#motion");
function sync() {
  engines.forEach((e) => e.setRunning(running));
  button.textContent = running ? "Pause all" : "Resume all";
}
function mount() {
  engines = [
    createPlasmaBall(document.querySelector("#hero")),
    createPlasmaBall(document.querySelector("#widget"), {
      palette: "ember",
      filaments: 20,
      branching: 1,
    }),
    createPlasmaBall(document.querySelector("#ambient"), {
      mode: "ambient",
      palette: "arctic",
      filaments: 18,
      branching: 1,
      speed: 0.5,
      reflection: 0.3,
    }),
  ];
  sync();
}
button.onclick = () => {
  running = !running;
  sync();
};
window.addEventListener("pagehide", () => {
  engines.forEach((e) => e.dispose());
  engines = [];
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted && !engines.length) mount();
});
mount();
