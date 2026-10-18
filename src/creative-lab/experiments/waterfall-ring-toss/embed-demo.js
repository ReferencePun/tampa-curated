import { createWaterToy } from "./engine.js";
const canvas = document.querySelector("canvas"),
  status = document.querySelector("output");
let engine,
  active = true,
  visible = true;
const scene = {
  chamber: { left: 50, right: 750, top: 20, bottom: 480 },
  pegs: [
    { id: "one", x: 275, tip: 235, base: 355 },
    { id: "two", x: 525, tip: 235, base: 355 },
  ],
  pumps: [
    { x: 275, y: 450, spread: 300 },
    { x: 525, y: 450, spread: 300 },
  ],
  scoring: { points: 5 },
};
function mount() {
  engine = createWaterToy(
    canvas,
    { ringCount: 8, turbulence: 0.25 },
    {
      scene,
      background(g) {
        g.clearRect(0, 0, 800, 500);
        g.fillStyle = "#c5ddd4";
        g.fillRect(0, 0, 800, 500);
        g.strokeStyle = "#8cb0a3";
        g.lineWidth = 1;
        for (let x = 50; x <= 750; x += 50) {
          g.beginPath();
          g.moveTo(x, 20);
          g.lineTo(x, 480);
          g.stroke();
        }
      },
      frame(s) {
        status.textContent = `${s.caught} rings · ${s.score} points · ${s.pumps} pumps`;
      },
    },
  );
  sync();
}
function sync() {
  engine?.setRunning(active && visible && !document.hidden);
}
const io = new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting;
  sync();
});
io.observe(canvas);
document.querySelector("#left").onclick = () => {
  active = true;
  sync();
  engine.pump(0);
};
document.querySelector("#right").onclick = () => {
  active = true;
  sync();
  engine.pump(1);
};
document.querySelector("#reset").onclick = () => engine.reset();
document.querySelector("#pause").onclick = (e) => {
  active = !active;
  e.target.textContent = active ? "Pause" : "Resume";
  sync();
};
document.addEventListener("visibilitychange", sync);
window.addEventListener("pagehide", () => {
  engine?.dispose();
  engine = null;
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted && !engine) mount();
});
mount();
