import { createDrawing, pathDocument, DEFAULTS } from "./model.js";
import { examplePath } from "./examples.js";
import { createRenderer } from "./renderer.js";
const canvas = document.querySelector("canvas"),
  slider = document.querySelector("input"),
  drawing = createDrawing("dial"),
  renderer = createRenderer(canvas),
  abort = new AbortController(),
  signal = abort.signal;
drawing.load(pathDocument(examplePath("skyline")));
function draw() {
  renderer.render(drawing.state(), DEFAULTS, {
    progress: +slider.value / 1000,
  });
  document.querySelector("#status").textContent =
    `${drawing.state().events.length} recorded segments`;
}
const observer = new ResizeObserver(() => {
  renderer.resize(canvas.clientWidth, canvas.clientWidth * 0.68);
  draw();
});
observer.observe(canvas);
slider.addEventListener("input", draw, { signal });
document.querySelector("#extend").addEventListener(
  "click",
  () => {
    drawing.begin();
    drawing.move(0.1, -0.15);
    drawing.commit();
    slider.value = "1000";
    draw();
  },
  { signal },
);
document.querySelector("#undo").addEventListener(
  "click",
  () => {
    drawing.undo();
    draw();
  },
  { signal },
);
function dispose() {
  abort.abort();
  observer.disconnect();
  renderer.dispose();
  drawing.dispose();
}
window.drawingExample = { drawing, renderer, dispose };
window.addEventListener("pagehide", dispose, { once: true });
