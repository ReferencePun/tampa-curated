import { createDiscTable } from "./engine.js";
const catalog = [
    { id: "blue", name: "Blue square", color: "#3a5d7a" },
    { id: "red", name: "Red square", color: "#b5573e" },
    { id: "green", name: "Green square", color: "#4c7458" },
  ],
  stack = ["blue", "red", "green", "blue", "red", "green"];
const canvas = document.querySelector("canvas"),
  status = document.querySelector("output");
let toy,
  active = true,
  visible = true;
function mount() {
  toy = createDiscTable(
    canvas,
    { stackSize: 6, power: 0.5 },
    {
      catalog,
      stack,
      drawDisc(g, disc, front, _style, size) {
        g.clearRect(0, 0, size, size);
        g.beginPath();
        g.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
        g.fillStyle = front ? disc.color : "#ddceb0";
        g.fill();
        g.strokeStyle = "#344b3e";
        g.lineWidth = 4;
        g.stroke();
        g.fillStyle = front ? "#f0e2ba" : "#6e7b62";
        if (front) g.fillRect(size * 0.3, size * 0.3, size * 0.4, size * 0.4);
        else {
          g.font = `bold ${size * 0.15}px Georgia`;
          g.textAlign = "center";
          g.fillText("TURN", size / 2, size * 0.52);
        }
      },
      frame(s) {
        status.textContent = `${s.phase} · ${s.you} collected · ${s.pending} face up`;
        document.querySelector("#collect").disabled = s.phase !== "result";
        document.querySelector("#strike").disabled = s.phase !== "ready";
      },
      interact() {
        active = true;
        sync();
      },
    },
  );
  sync();
}
function sync() {
  toy?.setRunning(active && visible && !document.hidden);
}
document.querySelector("#strike").onclick = () => {
  active = true;
  sync();
  toy.strike();
};
document.querySelector("#collect").onclick = () => toy.collect();
document.querySelector("#reset").onclick = () => toy.reset(stack);
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
