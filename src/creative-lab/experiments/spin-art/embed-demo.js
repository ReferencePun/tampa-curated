import { createSpinArt } from "./engine.js";
const canvas = document.querySelector("canvas"),
  status = document.querySelector("output");
let toy,
  visible = true,
  timeout = 0;
function sync() {
  toy?.setRunning(visible && !document.hidden);
}
function start() {
  toy = createSpinArt(
    canvas,
    {
      speed: 42,
      style: "splatter",
      colors: 3,
      palette: "citrus",
      ink: "#ed7036",
      thickness: 10,
    },
    {
      frame(s) {
        status.textContent = `${Math.round(Math.abs(s.rpm))} RPM · ${s.auto ? "pouring" : "move your hand over the paper"}`;
      },
    },
  );
  sync();
}
const io = new IntersectionObserver((e) => {
  visible = e[0].isIntersecting;
  sync();
});
io.observe(canvas);
document.addEventListener("visibilitychange", sync);
document.querySelector("#motor").onclick = (e) => {
  const active = !toy.getState().motor;
  toy.setMotor(active);
  e.target.textContent = active ? "Stop wheel" : "Spin wheel";
};
document.querySelector("#pour").onclick = () => {
  clearTimeout(timeout);
  toy.setMotor(true);
  toy.setAuto(true);
  timeout = setTimeout(() => toy?.setAuto(false), 3000);
};
document.querySelector("#clear").onclick = () => {
  toy.clear();
  document.querySelector("#motor").textContent = "Spin wheel";
};
document.querySelector("#save").onclick = async () => {
  const b = await toy.png(),
    u = URL.createObjectURL(b),
    a = document.createElement("a");
  a.href = u;
  a.download = "spin-art.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
};
window.addEventListener("pagehide", () => {
  clearTimeout(timeout);
  toy?.dispose();
  toy = null;
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted && !toy) start();
});
start();
