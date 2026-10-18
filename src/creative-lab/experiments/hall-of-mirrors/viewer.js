import * as THREE from "three";
import { options, sampleJourney, qualityProfile } from "./model.js";
import { createCorridor } from "./corridor.js";
import { createReflectionSystem } from "./reflections.js";
export function createHallViewer(canvas, initial = {}, onStatus = () => {}) {
  let settings = options(initial),
    disposed = false,
    lost = false,
    width = 1,
    height = 1,
    frames = 0,
    builds = 0,
    adaptive = 0,
    slow = 0,
    cost = 0,
    world,
    mirrors,
    lastPose,
    lastStats,
    profile;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor("#f0ebdf");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f0ebdf");
  scene.fog = new THREE.Fog("#f0ebdf", 16, 65);
  const camera = new THREE.PerspectiveCamera(56, 1, 0.04, 180);
  function configure() {
    profile = qualityProfile(settings.quality, width, adaptive);
    renderer.setPixelRatio(
      Math.min(globalThis.devicePixelRatio || 1, profile.pixelRatio),
    );
    renderer.setSize(width, height, false);
    mirrors?.update({
      depth: Math.min(settings.depth, profile.depthCap),
      size: profile.size,
      budget: profile.budget,
      brightness: settings.brightness,
      fade: settings.fade,
    });
  }
  function build() {
    if (world) {
      scene.remove(world.root);
      world.dispose();
      mirrors.dispose();
    }
    world = createCorridor(settings);
    scene.add(world.root);
    mirrors = createReflectionSystem(renderer, scene);
    world.definitions.forEach((m) => mirrors.add(m));
    builds++;
    configure();
  }
  build();
  function resize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    camera.aspect = width / height;
    camera.fov = width < 600 ? 68 : 56;
    camera.updateProjectionMatrix();
    configure();
  }
  function render(progress = settings.progress / 100, pointer = [0, 0]) {
    if (disposed || lost) return null;
    lastPose = sampleJourney(progress, settings, pointer);
    camera.position.copy(lastPose.position);
    camera.up.copy(lastPose.up);
    camera.lookAt(lastPose.target);
    camera.updateMatrixWorld(true);
    renderer.info.reset();
    const start = performance.now(),
      reflection = mirrors.render(camera);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    const elapsed = performance.now() - start;
    cost = cost ? cost * 0.8 + elapsed * 0.2 : elapsed;
    frames++;
    if (settings.quality === "auto" && frames > 3) {
      if (cost > 42) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow >= 5 && adaptive < 2) {
        adaptive++;
        slow = 0;
        configure();
        onStatus("Quality reduced to keep the drawing responsive.");
      }
    }
    lastStats = {
      frames,
      builds,
      costMs: cost,
      drawCalls: renderer.info.render.calls,
      lines: world.segments,
      passes: reflection.passes + 1,
      reflectionPasses: reflection.passes,
      depth: reflection.depth,
      budget: profile.budget,
      resolution: profile.size,
      adaptive,
      targets: reflection.targets,
      pixels: reflection.pixels,
      views: reflection.views,
      camera: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      phase: lastPose.phase,
      chamber: lastPose.chamber,
      width: canvas.width,
      height: canvas.height,
    };
    return lastStats;
  }
  return {
    render,
    resize,
    rebuild: build,
    get renderer() {
      return renderer;
    },
    get scene() {
      return scene;
    },
    get camera() {
      return camera;
    },
    get mirrors() {
      return mirrors;
    },
    getState: () => ({
      ...lastStats,
      settings: { ...settings },
      disposed,
      lost,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    }),
    setLost(value) {
      lost = value;
    },
    update(next) {
      const previous = settings;
      settings = options(next);
      if (
        ["version", "width", "length", "angle", "density", "light"].some(
          (k) => previous[k] !== settings[k],
        )
      )
        build();
      else {
        world.setGuides(settings.guides);
        if (previous.quality !== settings.quality) adaptive = 0;
        configure();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mirrors.dispose();
      world.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      if (!lost) renderer.forceContextLoss();
    },
  };
}
