import { createMagneticLayer } from "./engine.js";
const canvas = document.querySelector("canvas");
const layer = createMagneticLayer(
  canvas,
  { density: 2400, radius: 55 },
  {
    background(ctx) {
      ctx.fillStyle = "#efe5ca";
      ctx.fillRect(0, 0, 900, 760);
      ctx.fillStyle = "#a46040";
      ctx.textAlign = "center";
      ctx.font = "italic 46px Georgia";
      ctx.fillText("Make a little mischief.", 450, 190);
      ctx.strokeStyle = "#9aab8d";
      ctx.lineWidth = 2;
      ctx.strokeRect(80, 260, 740, 310);
      ctx.font = "16px Georgia";
      ctx.fillText("YOUR OWN ARTWORK GOES UNDER THE FILINGS", 450, 603);
    },
    change(s) {
      document.querySelector("#status").textContent =
        s.held + " filings on the magnet.";
    },
  },
);
document.querySelector("#pinch").onclick = () => layer.loadPinch();
document.querySelector("#lift").onclick = () => layer.release();
document.querySelector("#reset").onclick = () => layer.shake();
let visible = false;
const sync = () => layer.setRunning(visible && !document.hidden),
  observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    sync();
  });
observer.observe(canvas);
document.addEventListener("visibilitychange", sync);
addEventListener("pagehide", (event) => {
  if (event.persisted) {
    layer.setRunning(false);
    return;
  }
  observer.disconnect();
  document.removeEventListener("visibilitychange", sync);
  layer.dispose();
});
addEventListener("pageshow", (event) => {
  if (event.persisted) sync();
});
