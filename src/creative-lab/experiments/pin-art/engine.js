import * as THREE from "three";
import { PinFieldState, options, position, travelFor, clamp } from "./model.js";
import { pinGeometry, panelGeometry, displacedMaterial } from "./geometry.js";
const MATERIALS = {
  steel: { color: "#bcc7c3", metalness: 0.88, roughness: 0.3, clearcoat: 0.2 },
  brass: { color: "#bca276", metalness: 0.82, roughness: 0.36, clearcoat: 0.1 },
  graphite: {
    color: "#4a5b5d",
    metalness: 0.7,
    roughness: 0.31,
    clearcoat: 0.2,
  },
  resin: { color: "#91b9ad", metalness: 0.07, roughness: 0.28, clearcoat: 0.7 },
};
function environment(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#7b807c");
  const geometry = new THREE.BoxGeometry(1, 1, 1),
    materials = [];
  for (const [p, s, c] of [
    [[-4, 7, 4], [4, 1, 7], "#fff3df"],
    [[7, 1, 2], [1, 8, 5], "#d6edf0"],
    [[-3, -6, 0], [8, 1, 5], "#3e453f"],
    [[0, 0, -8], [8, 7, 1], "#a5aa9a"],
  ]) {
    const mat = new THREE.MeshBasicMaterial({ color: c }),
      mesh = new THREE.Mesh(geometry, mat);
    materials.push(mat);
    mesh.position.set(...p);
    mesh.scale.set(...s);
    scene.add(mesh);
  }
  const generator = new THREE.PMREMGenerator(renderer),
    target = generator.fromScene(scene, 0.12, 0.1, 30);
  generator.dispose();
  geometry.dispose();
  materials.forEach((m) => m.dispose());
  scene.clear();
  return target;
}
export function createPinField(canvas, initial = {}, onFrame = () => {}) {
  let config = options(initial),
    model = new PinFieldState(config),
    disposed = false,
    lost = false,
    running = false,
    reduced = false,
    raf = 0,
    last = 0,
    frames = 0,
    builds = 0,
    width = 1,
    height = 1,
    quality = 1,
    slow = 0,
    lastRevision = -1,
    board,
    pins,
    sockets,
    owned = [],
    hover = null;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor("#e5dfd3");
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100),
    raycaster = new THREE.Raycaster(),
    env = environment(renderer),
    travel = { value: travelFor(config) };
  scene.environment = env.texture;
  scene.environmentIntensity = 0.9;
  scene.add(new THREE.HemisphereLight("#f8f2df", "#8f9691", 1));
  const lamp = new THREE.DirectionalLight("#fff1d9", 2.5);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  Object.assign(lamp.shadow.camera, {
    left: -10,
    right: 10,
    top: 10,
    bottom: -10,
    near: 1,
    far: 40,
  });
  lamp.shadow.bias = -0.0002;
  lamp.shadow.normalBias = 0.018;
  scene.add(lamp);
  const fill = new THREE.DirectionalLight("#dce9ed", 1.2);
  fill.position.set(6, -5, 6);
  scene.add(fill);
  const floorGeo = new THREE.PlaneGeometry(200, 200),
    floorMat = new THREE.MeshStandardMaterial({
      color: "#e5dfd3",
      roughness: 1,
    }),
    floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  scene.add(floor);
  const ghostGeo = {
      sphere: new THREE.SphereGeometry(1, 20, 12),
      cube: new THREE.BoxGeometry(2, 2, 1.4),
      ring: new THREE.TorusGeometry(0.64, 0.27, 8, 28),
    },
    starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 + Math.PI / 2,
      r = i % 2 ? 0.45 : 0.95;
    if (!i) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  starShape.closePath();
  ghostGeo.star = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.5,
    bevelEnabled: false,
  });
  const ghostMaterial = new THREE.MeshBasicMaterial({
      color: "#67563c",
      wireframe: true,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
    ghostGroup = new THREE.Group();
  const ghosts = {};
  for (const [kind, geo] of Object.entries(ghostGeo)) {
    const mesh = new THREE.Mesh(geo, ghostMaterial);
    mesh.visible = false;
    ghostGroup.add(mesh);
    ghosts[kind] = mesh;
  }
  scene.add(ghostGroup);
  function own(resource) {
    owned.push(resource);
    return resource;
  }
  function cleanBoard() {
    if (board) {
      scene.remove(board);
      board.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
      });
    }
    owned.forEach((r) => r.dispose());
    owned = [];
  }
  function build() {
    cleanBoard();
    board = new THREE.Group();
    scene.add(board);
    const g = model.grid,
      pitch = g.pitch;
    travel.value = travelFor(config);
    const geo = own(pinGeometry(pitch, config.pinLength));
    geo.setAttribute(
      "pinHeight",
      new THREE.InstancedBufferAttribute(model.heights, 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const material = own(
      displacedMaterial(
        new THREE.MeshPhysicalMaterial({
          ...MATERIALS[config.material],
          envMapIntensity: 1.25,
        }),
        travel,
      ),
    );
    pins = new THREE.InstancedMesh(geo, material, g.count);
    pins.customDepthMaterial = own(
      displacedMaterial(
        new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }),
        travel,
      ),
    );
    pins.castShadow = true;
    pins.receiveShadow = false;
    pins.frustumCulled = false;
    const matrix = new THREE.Matrix4(),
      color = new THREE.Color();
    for (let i = 0; i < g.count; i++) {
      const [x, y] = position(g, i);
      matrix.makeTranslation(x, y, 0);
      pins.setMatrixAt(i, matrix);
      color.setScalar(0.89 + 0.11 * (((i * 73) % 101) / 101));
      pins.setColorAt(i, color);
    }
    board.add(pins);
    const bodyMat = own(
        new THREE.MeshStandardMaterial({
          color: config.material === "brass" ? "#6c6353" : "#4b5854",
          metalness: 0.45,
          roughness: 0.42,
        }),
      ),
      body = new THREE.Mesh(
        own(panelGeometry(13.15, 9.15, config.boardDepth + 0.02, 0.34)),
        bodyMat,
      );
    body.castShadow = true;
    body.receiveShadow = true;
    board.add(body);
    const plate = new THREE.Mesh(
      own(new THREE.PlaneGeometry(12.35, 8.35)),
      own(
        new THREE.MeshStandardMaterial({
          color: "#29332f",
          metalness: 0.35,
          roughness: 0.55,
        }),
      ),
    );
    plate.position.z = config.boardDepth / 2 + 0.047;
    plate.receiveShadow = true;
    board.add(plate);
    sockets = new THREE.InstancedMesh(
      own(new THREE.RingGeometry(pitch * 0.12, pitch * 0.225, 8)),
      own(new THREE.MeshBasicMaterial({ color: "#a1aba0" })),
      g.count,
    );
    for (let i = 0; i < g.count; i++) {
      const [x, y] = position(g, i);
      matrix.makeTranslation(x, y, config.boardDepth / 2 + 0.049);
      sockets.setMatrixAt(i, matrix);
    }
    board.add(sockets);
    const screwGeo = own(new THREE.CylinderGeometry(0.085, 0.085, 0.035, 12));
    screwGeo.rotateX(Math.PI / 2);
    const screwMat = own(
        new THREE.MeshStandardMaterial({
          color: "#b4b6a8",
          metalness: 0.85,
          roughness: 0.33,
        }),
      ),
      slotGeo = own(new THREE.BoxGeometry(0.09, 0.015, 0.006)),
      slotMat = own(new THREE.MeshBasicMaterial({ color: "#39453f" }));
    for (const x of [-6.35, 6.35])
      for (const y of [-4.35, 4.35]) {
        const screw = new THREE.Mesh(screwGeo, screwMat);
        screw.position.set(x, y, config.boardDepth / 2 + 0.04);
        board.add(screw);
        const slot = new THREE.Mesh(slotGeo, slotMat);
        slot.position.set(x, y, config.boardDepth / 2 + 0.06);
        slot.rotation.z = 0.3;
        board.add(slot);
      }
    const marks = [];
    for (let i = 0; i <= 24; i++) {
      const x = -6 + i * 0.5;
      marks.push(
        x,
        -4.31,
        config.boardDepth / 2 + 0.05,
        x,
        -4.31 + (i % 4 === 0 ? 0.11 : 0.05),
        config.boardDepth / 2 + 0.05,
      );
    }
    const marksGeo = own(new THREE.BufferGeometry());
    marksGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(marks, 3),
    );
    board.add(
      new THREE.LineSegments(
        marksGeo,
        own(
          new THREE.LineBasicMaterial({
            color: "#a5afa1",
            transparent: true,
            opacity: 0.55,
          }),
        ),
      ),
    );
    floor.position.z = -config.pinLength / 2 - 0.32;
    builds++;
    lastRevision = -1;
  }
  function view() {
    camera.aspect = width / height;
    const extent = Math.max(13.8 / camera.aspect, 10.2),
      distance =
        ((extent / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.28) /
        config.zoom,
      yaw = (config.rotation * Math.PI) / 180,
      pitch = (config.tilt * Math.PI) / 180;
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance,
      Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const a = (config.light * Math.PI) / 180;
    lamp.position.set(Math.cos(a) * 8, Math.sin(a) * 8, 13);
  }
  function render() {
    if (disposed || lost) return;
    const started = performance.now();
    if (lastRevision !== model.revision) {
      pins.geometry.attributes.pinHeight.needsUpdate = true;
      lastRevision = model.revision;
    }
    ghostGroup.visible = !!hover;
    for (const mesh of Object.values(ghosts)) mesh.visible = false;
    if (hover) {
      const shape = config.mode === "stamp" ? config.shape : "sphere",
        mesh = ghosts[shape];
      mesh.visible = true;
      const h = model.valueAt(...hover);
      ghostGroup.position.set(
        hover[0],
        hover[1],
        config.pinLength / 2 + h * travel.value + 0.04,
      );
      ghostGroup.scale.set(
        config.radius,
        config.radius,
        Math.min(0.7, travel.value * 0.7),
      );
    }
    renderer.render(scene, camera);
    frames++;
    const elapsed = performance.now() - started;
    if (elapsed > 35 && quality > 0.7) {
      if (++slow > 18) {
        quality = Math.max(0.7, quality - 0.15);
        resize(width, height);
        slow = 0;
      }
    } else slow = Math.max(0, slow - 1);
    onFrame({
      ...model.statistics(),
      frames,
      builds,
      width: canvas.width,
      height: canvas.height,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      quality,
      renderMs: elapsed,
      running: !!raf,
      renderer: "Three.js · instanced sliding rods",
      fps: raf ? Math.min(60, Math.round(1000 / Math.max(16.7, elapsed))) : 0,
    });
  }
  function tick(now) {
    raf = 0;
    if (disposed || lost || !running) return;
    // Catch up in bounded substeps when rendering is slower than 60 Hz.
    // A slow GPU should not turn a short spring release into several seconds.
    let remaining = last ? Math.min(0.18, (now - last) / 1000) : 1 / 60;
    last = now;
    let active = false;
    while (remaining > 0) {
      const dt = Math.min(0.05, remaining);
      active = model.step(dt);
      remaining -= dt;
    }
    if (active && !reduced) raf = requestAnimationFrame(tick);
    render();
    if (!active) last = 0;
  }
  function wake() {
    if (disposed || lost) return;
    if (reduced || !running) {
      model.snap();
      render();
      return;
    }
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function resize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setPixelRatio(
      Math.min(globalThis.devicePixelRatio || 1, width < 650 ? 1.3 : 1.6) *
        quality,
    );
    renderer.setSize(width, height, false);
    view();
  }
  function update(next) {
    if (disposed) return;
    const before = config;
    config = options({ ...config, ...next });
    model.update(config);
    if (
      ["density", "pinLength", "boardDepth", "material"].some(
        (k) => before[k] !== config[k],
      )
    )
      build();
    view();
    wake();
  }
  function hit(x, y) {
    raycaster.setFromCamera(
      new THREE.Vector2((x / width) * 2 - 1, 1 - (y / height) * 2),
      camera,
    );
    const ray = raycaster.ray;
    if (Math.abs(ray.direction.z) < 0.0001) return null;
    let z = config.pinLength / 2,
      p = new THREE.Vector3();
    for (let i = 0; i < 4; i++) {
      const t = (z - ray.origin.z) / ray.direction.z;
      if (t <= 0) return null;
      ray.at(t, p);
      z = config.pinLength / 2 + model.valueAt(p.x, p.y) * travel.value;
    }
    return Math.abs(p.x) <= 6 && Math.abs(p.y) <= 4 ? [p.x, p.y] : null;
  }
  function project(point) {
    const v = new THREE.Vector3(
      point[0],
      point[1],
      config.pinLength / 2 + model.valueAt(...point) * travel.value,
    ).project(camera);
    return { x: (v.x * 0.5 + 0.5) * width, y: (0.5 - v.y * 0.5) * height };
  }
  build();
  resize(900, 620);
  render();
  return {
    update,
    resize,
    render,
    hit,
    project,
    press(point, from = point, pressure = 1) {
      model.press(point, from, undefined, pressure);
      hover = point;
      wake();
    },
    releasePointer() {
      model.releasePointer();
      hover = null;
      wake();
    },
    hover(point) {
      hover = point;
      render();
    },
    clear() {
      model.clear();
      hover = null;
      wake();
    },
    setSample(id) {
      model.setSample(id);
      wake();
    },
    replay() {
      model.heights.fill(0);
      model.velocity.fill(0);
      model.phase = 0;
      model.revision++;
      model.targets();
      wake();
    },
    setProcedural(fn, { immediate = false } = {}) {
      model.setProcedural(fn);
      if (immediate) model.snap();
      wake();
    },
    setHeightMap(map, opts) {
      model.setHeightMap(map, opts);
      wake();
    },
    load(doc) {
      model.load(doc);
      config = model.settings;
      build();
      view();
      wake();
    },
    setRunning(value) {
      running = !!value;
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      if (running && !reduced) wake();
      else render();
    },
    setReduced(value) {
      reduced = !!value;
      if (reduced) {
        cancelAnimationFrame(raf);
        raf = 0;
        model.snap();
        render();
      } else wake();
    },
    advance(seconds) {
      let left = clamp(seconds, 0, 10);
      while (left > 0) {
        const dt = Math.min(1 / 60, left);
        model.step(dt);
        left -= dt;
      }
      render();
    },
    getState() {
      return {
        ...model.statistics(),
        settings: { ...config },
        heights: Array.from(model.heights),
        raw: Array.from(model.raw),
        frames,
        builds,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        width: canvas.width,
        height: canvas.height,
        quality,
        running,
        animating: !!raf,
        disposed,
        travel: travel.value,
      };
    },
    serialize: () => model.serialize(),
    snapshot() {
      return {
        settings: { ...config },
        raw: model.raw.slice(),
        heights: model.heights.slice(),
        velocity: model.velocity.slice(),
        phase: model.phase,
      };
    },
    restore(snapshot) {
      update(snapshot.settings);
      for (const key of ["raw", "heights", "velocity"])
        model[key].set(snapshot[key]);
      model.phase = snapshot.phase;
      model.contact = null;
      model.targets();
      model.revision++;
      render();
    },
    get renderer() {
      return renderer;
    },
    get model() {
      return model;
    },
    async exportPNG() {
      render();
      return new Promise((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(Error("Could not export the sculpture.")),
          "image/png",
        ),
      );
    },
    setLost() {
      lost = true;
      cancelAnimationFrame(raf);
      raf = 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      cleanBoard();
      Object.values(ghostGeo).forEach((g) => g.dispose());
      ghostMaterial.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      lamp.shadow.map?.dispose();
      env.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      if (!lost) renderer.forceContextLoss();
      model.dispose();
    },
  };
}
