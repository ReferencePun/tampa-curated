import { createMarginWorker } from "./worker.js";
const worker = createMarginWorker({
  element: document.querySelector(".art"),
  activity: "hammer",
  target: document.querySelector(".divider"),
  scrollTrigger: document.querySelector("#chapter"),
  character: "coat",
});
document.querySelector("#detach").addEventListener("click", () => {
  worker.dispose();
  document.querySelector("#detach").textContent =
    "Worker detached; document remains usable";
});
window.addEventListener("pagehide", () => worker.dispose(), { once: true });
