import { createKaleidoscope } from "./engine.js";
const canvas = document.querySelector("canvas"),
  button = document.querySelector("#pause");
let effect,
  active = !matchMedia("(prefers-reduced-motion: reduce)").matches;
function mount() {
  effect = createKaleidoscope(
    canvas,
    { mirrors: 5, rotationSpeed: 0.6, animationSpeed: 0.3, border: "graphite" },
    {
      drawSource(c, _config, state) {
        const g = c.getContext("2d"),
          n = c.width;
        g.fillStyle = "#163d50";
        g.fillRect(0, 0, n, n);
        g.strokeStyle = "#dfb974";
        g.lineWidth = 10;
        for (let i = 0; i < 15; i++) {
          g.beginPath();
          g.ellipse(
            n * 0.5 + Math.sin(state.time.source + i) * 40,
            n * 0.5,
            n * (0.05 + i * 0.038),
            n * (0.05 + i * 0.019),
            i * 0.12,
            0,
            Math.PI * 2,
          );
          g.stroke();
        }
      },
      frame(s) {
        document.querySelector("output").textContent =
          `${s.config.mirrors * 2} reflected sectors`;
      },
    },
  );
  sync();
}
function sync() {
  effect?.setRunning(active && !document.hidden);
  button.textContent = active ? "Hold still" : "Set it moving";
}
button.onclick = () => {
  active = !active;
  sync();
};
document.querySelector("#mirrors").onclick = () => {
  const c = effect.getState().config;
  effect.update({ ...c, mirrors: c.mirrors === 9 ? 3 : c.mirrors + 1 });
};
document.addEventListener("visibilitychange", sync);
window.addEventListener("pagehide", () => {
  effect?.dispose();
  effect = null;
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted && !effect) mount();
});
mount();
