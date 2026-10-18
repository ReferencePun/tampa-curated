import { mount } from "./index.js";
const container = document.querySelector("#toy");
const viewer = mount(
  container,
  { mode: "stereo", palette: "seafoam" },
  () => {},
  {
    reel: {
      version: 1,
      id: "example",
      title: "A portable little world",
      scenes: [
        {
          kind: "world",
          theme: "garden",
          seed: 1,
          title: "The garden",
          caption: "An original miniature.",
        },
        {
          kind: "illustration",
          theme: "harbor",
          seed: 2,
          title: "The harbour",
          caption: "The next page in a story.",
        },
      ],
    },
    onSceneChange(scene) {
      document.querySelector("#caption").textContent =
        scene.title + " — " + scene.caption;
    },
  },
);
let visible = false;
const sync = () => viewer.setRunning(visible && !document.hidden);
const observer = new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting;
  sync();
});
observer.observe(container);
document.addEventListener("visibilitychange", sync);
addEventListener("pagehide", (event) => {
  if (event.persisted) {
    viewer.setRunning(false);
    return;
  }
  observer.disconnect();
  document.removeEventListener("visibilitychange", sync);
  viewer.dispose();
});
addEventListener("pageshow", (event) => {
  if (event.persisted) sync();
});
