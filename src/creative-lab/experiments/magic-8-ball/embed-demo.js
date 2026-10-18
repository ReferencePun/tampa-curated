import { createAnswerOrb } from "./engine.js";
const canvas = document.querySelector("canvas"),
  output = document.querySelector("output"),
  button = document.querySelector("#pause");
let effect,
  active = !matchMedia("(prefers-reduced-motion: reduce)").matches;
const answerSets = {
  onboarding: {
    name: "One small next step",
    answers: [
      ["prompt", "Choose one thing you want to explore."],
      ["prompt", "Try a small change and see what happens."],
      ["prompt", "Save something you would like to revisit."],
    ],
  },
};
function sync() {
  effect?.setRunning(active && !document.hidden);
  button.textContent = active ? "Pause" : "Resume";
}
function mount() {
  effect = createAnswerOrb(
    canvas,
    { answerSet: "onboarding", color: "#4e526e", seed: 14, revealSpeed: 1.5 },
    {
      answerSets,
      interact() {
        active = true;
        sync();
      },
      shake() {
        output.textContent = "A thought is on its way…";
      },
      answer(a) {
        output.textContent = a.text;
      },
    },
  );
  sync();
}
document.querySelector("#ask").onclick = () => {
  active = true;
  sync();
  effect.shake();
};
button.onclick = () => {
  active = !active;
  sync();
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
