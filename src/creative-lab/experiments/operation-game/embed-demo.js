import { createPrecisionToy } from "./engine.js";
const scene = {
  width: 900,
  height: 720,
  cavities: [
    {
      id: "corner",
      name: "Triangle",
      polygon: [
        { x: 240, y: 200 },
        { x: 550, y: 200 },
        { x: 550, y: 260 },
        { x: 300, y: 260 },
        { x: 300, y: 510 },
        { x: 240, y: 510 },
      ],
      path: [
        { x: 515, y: 230 },
        { x: 270, y: 230 },
        { x: 270, y: 475 },
      ],
      start: { x: 515, y: 230 },
      exit: { x: 270, y: 475 },
      radius: 10,
      exitRadius: 12,
    },
  ],
  rules: { points: 40, penalty: 7, strikes: 2 },
};
let toy,
  active = true,
  visible = true;
const canvas = document.querySelector("canvas"),
  status = document.querySelector("output");
function mount() {
  toy = createPrecisionToy(
    canvas,
    { objectCount: 1 },
    {
      scene,
      background(g) {
        g.fillStyle = "#e0e1cc";
        g.fillRect(0, 0, 900, 720);
        g.strokeStyle = "#b6c6ac";
        for (let x = 0; x < 900; x += 30) {
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x, 720);
          g.stroke();
        }
        const p = scene.cavities[0].polygon;
        g.beginPath();
        p.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
        g.closePath();
        g.fillStyle = "#36574b";
        g.fill();
        g.strokeStyle = "#8f9e87";
        g.lineWidth = 6;
        g.stroke();
      },
      piece(g, _c, x, y, r) {
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r, y + r);
        g.lineTo(x - r, y + r);
        g.closePath();
        g.fillStyle = "#d5a252";
        g.fill();
      },
      frame(s) {
        status.textContent = `${s.score} points · ${s.faults} contacts · ${s.status}`;
      },
    },
  );
  sync();
}
function sync() {
  toy?.setRunning(active && visible && !document.hidden);
}
document.querySelector("#focus").onclick = () => {
  toy.inspect("corner");
  canvas.focus();
};
document.querySelector("#reset").onclick = () => toy.reset();
document.querySelector("#pause").onclick = (e) => {
  active = !active;
  e.target.textContent = active ? "Pause" : "Resume";
  sync();
};
const io = new IntersectionObserver((e) => {
  visible = e[0].isIntersecting;
  sync();
});
io.observe(canvas);
document.addEventListener("visibilitychange", sync);
window.addEventListener("pagehide", () => {
  toy?.dispose();
  toy = null;
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted && !toy) mount();
});
mount();
