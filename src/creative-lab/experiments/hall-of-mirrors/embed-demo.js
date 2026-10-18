import * as THREE from "three";
import { createReflectionSystem } from "./reflections.js";
const canvas = document.querySelector("canvas"),
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  }),
  scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(58, 1, 0.04, 100);
scene.background = new THREE.Color("#f0ebdf");
camera.position.set(0, 2, 6);
camera.lookAt(0, 1.6, -3);
const box = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 1.4, 0.8),
  new THREE.MeshBasicMaterial({ color: "#a74b35" }),
);
box.position.set(-0.4, 0.7, -3);
scene.add(box);
const grid = new THREE.GridHelper(20, 20, "#8c7a5d", "#c2b59a");
scene.add(grid);
const system = createReflectionSystem(renderer, scene, {
  depth: 3,
  size: 320,
  budget: 8,
});
system.add({
  id: "left",
  position: [-3, 2, -3],
  rotation: Math.PI / 2,
  width: 5,
  height: 4,
});
system.add({
  id: "right",
  position: [3, 2, -3],
  rotation: -Math.PI / 2,
  width: 5,
  height: 4,
});
let disposed = false;
function render() {
  if (disposed) return;
  camera.updateMatrixWorld();
  renderer.info.autoReset = false;
  renderer.info.reset();
  const stats = system.render(camera);
  renderer.render(scene, camera);
  document.querySelector("#status").textContent =
    `${stats.passes} bounded reflection passes; ${stats.depth} levels.`;
  return stats;
}
function resize() {
  const b = canvas.getBoundingClientRect();
  renderer.setSize(b.width, b.height, false);
  camera.aspect = b.width / b.height;
  camera.updateProjectionMatrix();
  render();
}
const observer = new ResizeObserver(resize);
observer.observe(canvas);
document.querySelector("#camera").addEventListener("input", (e) => {
  camera.position.x = +e.target.value;
  camera.lookAt(0, 1.6, -3);
  render();
});
document.querySelector("#depth").addEventListener("input", (e) => {
  system.update({ depth: +e.target.value });
  render();
});
function dispose() {
  if (disposed) return;
  disposed = true;
  observer.disconnect();
  system.dispose();
  box.geometry.dispose();
  box.material.dispose();
  grid.geometry.dispose();
  grid.material.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  document.querySelector("#status").textContent =
    "Scene disposed. All mirror targets released.";
}
document.querySelector("#dispose").addEventListener("click", dispose);
window.addEventListener("pagehide", dispose, { once: true });
globalThis.mirrorExample = {
  renderer,
  scene,
  camera,
  box,
  system,
  render,
  dispose,
};
resize();
