import { createPocketViewer } from "./viewer.js";
const workshop = {
  id: "workshop",
  name: "The little workshop",
  shell: { width: 10, depth: 8, radius: 2.2, lidHeight: 1.24 },
  palette: { shell: "#7c9cae", ground: "#dacbab", roof: "#ac7f65" },
  lid: "sun",
  camera: {
    height: 2.4,
    points: [
      [0, 3],
      [-3, 0],
      [0, -2.5],
      [3, 0],
    ],
  },
  pieces: [
    { id: "box", type: "compartment", position: [-2, 0, 1] },
    { id: "wheel", type: "carousel", position: [1.6, 0, -0.7] },
    { id: "plant", type: "sprout", position: [-1, 0, -1.8] },
  ],
  paths: [
    [
      [0, 2],
      [-1, 1],
      [-1, -1.5],
    ],
  ],
  actions: [
    {
      id: "box",
      target: "box",
      kind: "hinge",
      from: 0,
      to: -1.65,
      label: "Open the drawer",
      marker: [-2, 1, 1],
    },
    {
      id: "wheel",
      target: "wheel",
      kind: "spin",
      turns: 1.5,
      label: "Turn the platform",
      marker: [1.6, 1.4, -0.7],
    },
    {
      id: "plant",
      target: "plant",
      kind: "lift",
      height: 0.5,
      label: "Lift the sprout",
      marker: [-1, 1, -1.8],
    },
  ],
};
const canvas = document.querySelector("canvas"),
  viewer = createPocketViewer(
    canvas,
    { world: "workshop", open: 100 },
    { workshop },
  ),
  abort = new AbortController(),
  signal = abort.signal,
  state = {};
const resize = () => {
  viewer.resize(canvas.clientWidth, canvas.clientHeight);
  viewer.render();
};
resize();
const observer = new ResizeObserver(resize);
observer.observe(canvas);
for (const key of ["open", "rotation"])
  document.getElementById(key).addEventListener(
    "input",
    (e) => {
      viewer.update({ [key]: +e.target.value });
      viewer.render();
    },
    { signal },
  );
document.querySelectorAll("[data-mechanism]").forEach((button) =>
  button.addEventListener(
    "click",
    () => {
      const key = button.dataset.mechanism;
      state[key] = state[key] ? 0 : 100;
      viewer.update(state);
      viewer.render();
    },
    { signal },
  ),
);
function dispose() {
  abort.abort();
  observer.disconnect();
  viewer.dispose();
  document.getElementById("status").textContent = "Resources released.";
}
document
  .getElementById("dispose")
  .addEventListener("click", dispose, { signal });
window.addEventListener("pagehide", dispose, { signal });
window.pocketExample = { viewer, workshop, dispose };
