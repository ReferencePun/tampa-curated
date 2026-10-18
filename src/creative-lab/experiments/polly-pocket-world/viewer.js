import * as THREE from "three";
import { createToy } from "./toy.js";
import { WORLDS } from "./worlds.js";
import { options, smooth } from "./model.js";
export function createPocketViewer(
  canvas,
  initial = {},
  definitions = WORLDS,
  builders = {},
) {
  const normalize = (config) => ({
    ...options(config),
    world: Object.hasOwn(definitions, config.world)
      ? config.world
      : Object.keys(definitions)[0],
  });
  let settings = normalize(initial),
    toy,
    route,
    disposed = false,
    lost = false,
    frames = 0,
    builds = 0,
    width = 1,
    height = 1;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor("#eee8dd");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(36, 1, 0.07, 150),
    raycaster = new THREE.Raycaster();
  scene.add(new THREE.HemisphereLight("#fff6df", "#a4aaa6", 1.3));
  const light = new THREE.DirectionalLight("#fff2df", 2.5);
  light.position.set(-5, 13, 8);
  light.castShadow = true;
  Object.assign(light.shadow.camera, {
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
    near: 0.5,
    far: 40,
  });
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0003;
  light.shadow.normalBias = 0.035;
  scene.add(light);
  const fill = new THREE.DirectionalLight("#d4e6e2", 0.8);
  fill.position.set(7, 5, -5);
  scene.add(fill);
  const floorGeometry = new THREE.PlaneGeometry(200, 200),
    floorMaterial = new THREE.MeshStandardMaterial({
      color: "#eee8dd",
      roughness: 1,
    }),
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.48;
  floor.receiveShadow = true;
  scene.add(floor);
  function build() {
    if (toy) {
      scene.remove(toy.root);
      toy.dispose();
    }
    toy = createToy(
      definitions[settings.world] || Object.values(definitions)[0],
      settings,
      builders,
    );
    scene.add(toy.root);
    route = new THREE.CatmullRomCurve3(
      toy.definition.camera.points.map(
        ([x, z]) => new THREE.Vector3(x, toy.definition.camera.height, z),
      ),
      true,
    );
    builds++;
  }
  build();
  function render(visual = {}) {
    if (disposed || lost) return;
    const open = visual.open ?? settings.open,
      entry = visual.entry ?? (settings.enter ? 1 : 0),
      rotation = visual.rotation ?? settings.rotation,
      travel = visual.travel ?? settings.travel,
      values = visual.actions ?? [
        settings.actionOne,
        settings.actionTwo,
        settings.actionThree,
      ];
    toy.apply(open, values);
    toy.root.rotation.y = (rotation * Math.PI) / 180;
    toy.root.updateMatrixWorld(true);
    const openness = smooth(open / 100),
      target = new THREE.Vector3(
        0,
        1.05 + openness * 1.8,
        -openness * 1.7,
      ).applyMatrix4(toy.root.matrixWorld),
      distance = (20 + openness * 6.8) / settings.zoom,
      theta = (settings.tilt * Math.PI) / 180,
      aspect = camera.aspect;
    const compensate = aspect < 1 ? 1 / Math.pow(aspect, 0.65) : 1;
    const outside = new THREE.Vector3(
      0,
      Math.sin(theta) * distance,
      Math.cos(theta) * distance,
    )
      .multiplyScalar(compensate)
      .add(target);
    const t = travel / 100,
      inside = route.getPointAt(t),
      ahead = route.getPointAt((t + 0.13) % 1);
    inside.applyMatrix4(toy.root.matrixWorld);
    ahead.y = 1.05;
    ahead.applyMatrix4(toy.root.matrixWorld);
    camera.position.copy(outside).lerp(inside, smooth(entry));
    const look = target.clone().lerp(ahead, smooth(entry));
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    camera.fov = (36 + entry * 24) / (1 + entry * (settings.zoom - 1) * 0.45);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    renderer.render(scene, camera);
    frames++;
    return getState();
  }
  function resize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setPixelRatio(
      Math.min(globalThis.devicePixelRatio || 1, width < 600 ? 1.25 : 1.5),
    );
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  function projected() {
    if (settings.open < 55) return [];
    return toy.targets.map((t) => {
      let p = t.point.clone();
      const m = toy.mechanisms.get(t.id);
      if (m.definition.kind === "path")
        p = m.object.root.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      p.applyMatrix4(toy.root.matrixWorld);
      const distance = camera.position.distanceTo(p),
        direction = p.clone().sub(camera.position).normalize();
      raycaster.set(camera.position, direction);
      const hits = raycaster.intersectObject(toy.root, true);
      const blocked = hits.length && hits[0].distance < distance - 0.22;
      const n = p.project(camera);
      return {
        ...t,
        x: (n.x * 0.5 + 0.5) * width,
        y: (-0.5 * n.y + 0.5) * height,
        visible:
          !blocked &&
          n.z < 1 &&
          n.z > -1 &&
          Math.abs(n.x) < 0.94 &&
          Math.abs(n.y) < 0.92,
      };
    });
  }
  function pick(x, y) {
    raycaster.setFromCamera(
      new THREE.Vector2((x / width) * 2 - 1, 1 - (y / height) * 2),
      camera,
    );
    const hits = raycaster.intersectObject(toy.root, true);
    return hits.length
      ? { distance: hits[0].distance, point: hits[0].point.toArray() }
      : null;
  }
  function getState() {
    return {
      frames,
      builds,
      disposed,
      camera: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      lidAngle: toy.lid.rotation.x,
      world: toy.definition.id,
      counts: toy.counts,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      width: canvas.width,
      height: canvas.height,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    };
  }
  return {
    render,
    resize,
    projected,
    pick,
    getState,
    getToy: () => toy,
    get renderer() {
      return renderer;
    },
    get camera() {
      return camera;
    },
    update(next) {
      const previous = settings;
      settings = normalize({ ...settings, ...next });
      if (
        ["world", "density", "palette"].some((k) => previous[k] !== settings[k])
      )
        build();
    },
    setLost() {
      lost = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      toy.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      light.shadow.map?.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      if (!lost) renderer.forceContextLoss();
    },
  };
}
