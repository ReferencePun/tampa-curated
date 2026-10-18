import * as THREE from "three";
import { mirrorDefinitions, options } from "./model.js";
/** All geometry is original. Segments are batched by ink weight, rather than per architectural object. */
export function createCorridor(input = {}) {
  const o = options(input),
    root = new THREE.Group(),
    arrays = { ink: [], pencil: [], hatch: [], guide: [] },
    resources = [],
    seed = (n) => {
      const a = Math.sin(n * 127.1 + 31.7) * 43758.5453;
      return a - Math.floor(a);
    };
  let count = 0,
    transform = new THREE.Matrix4();
  function line(a, b, kind = "ink", rough = 0.009) {
    const arr = arrays[kind],
      id = count++;
    for (const [i, p] of [a, b].entries()) {
      const point = new THREE.Vector3(...p);
      if (rough) {
        point.x += (seed(id * 9 + i * 3) - 0.5) * rough;
        point.y += (seed(id * 9 + i * 3 + 1) - 0.5) * rough;
        point.z += (seed(id * 9 + i * 3 + 2) - 0.5) * rough;
      }
      point.applyMatrix4(transform);
      arr.push(...point.toArray());
    }
  }
  function path(points, kind = "ink", rough = 0.009) {
    for (let i = 1; i < points.length; i++)
      line(points[i - 1], points[i], kind, rough);
  }
  function rect(x, y, z, w, h, kind = "ink") {
    path(
      [
        [x, y, z],
        [x + w, y, z],
        [x + w, y + h, z],
        [x, y + h, z],
        [x, y, z],
      ],
      kind,
    );
  }
  function box(x, y, z, w, h, d, kind = "ink") {
    rect(x, y, z, w, h, kind);
    rect(x, y, z - d, w, h, kind);
    for (const [xx, yy] of [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ])
      line([xx, yy, z], [xx, yy, z - d], kind);
  }
  function ring(x, y, z, r, kind = "ink", axis = "xy", steps = 48) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      points.push(
        axis === "xz"
          ? [x + Math.cos(a) * r, y, z + Math.sin(a) * r]
          : [x + Math.cos(a) * r, y + Math.sin(a) * r, z],
      );
    }
    path(points, kind);
  }
  function arch(x, y, z, w, h) {
    line([x - w / 2, y, z], [x - w / 2, y + h - w / 2, z]);
    line([x + w / 2, y, z], [x + w / 2, y + h - w / 2, z]);
    const points = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI;
      points.push([
        x + (Math.cos(a) * w) / 2,
        y + h - w / 2 + (Math.sin(a) * w) / 2,
        z,
      ]);
    }
    path(points);
  }
  function column(x, z, height = 5.8) {
    for (const y of [0.08, 0.22, 0.37, height - 0.25, height - 0.1]) {
      ring(x, y, z, 0.3, y < 0.4 ? "ink" : "pencil", "xz", 20);
      ring(x, y + 0.035, z, 0.32, "pencil", "xz", 20);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        r = 0.2;
      line(
        [x + Math.cos(a) * r, 0.4, z + Math.sin(a) * r],
        [x + Math.cos(a) * r, height - 0.27, z + Math.sin(a) * r],
        i % 3 ? "pencil" : "ink",
      );
    }
    for (let j = 0; j < o.density * 12; j++) {
      const y = 0.5 + j * 0.13;
      line([x - 0.16, y, z + 0.14], [x + 0.05, y + 0.11, z + 0.2], "hatch");
    }
    box(x - 0.35, 0, z + 0.35, 0.7, 0.1, 0.7, "pencil");
  }
  function gear(x, y, z, r = 0.55) {
    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2,
        rr = r * (i % 4 < 2 ? 1 : 0.88);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr, z]);
    }
    path(pts);
    ring(x, y, z, r * 0.7, "pencil");
    ring(x, y, z, r * 0.18);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      line(
        [x + Math.cos(a) * r * 0.22, y + Math.sin(a) * r * 0.22, z],
        [x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66, z],
        "pencil",
      );
    }
    line([x, y, z - 0.25], [x, y, z + 0.32]);
  }
  const w = o.width / 2,
    L = o.length;
  // Perspective floor, ceiling ribs, incomplete walls and paired fluted columns.
  for (let z = 2; z >= -L - 7; z -= 2) {
    line([-w, 0, z], [w, 0, z], "pencil");
    line([-w, 6, z], [w, 6, z], "guide");
  }
  for (let x = -w; x <= w; x += 1) {
    line([x, 0, 4], [x, 0, -L - 6], Math.abs(x) < 0.1 ? "guide" : "pencil");
    line([x, 6, 2], [x, 6, -L], "guide");
  }
  for (const side of [-1, 1]) {
    line([side * w, 0, 2], [side * w, 0, -L], "ink");
    line([side * w, 6, 2], [side * w, 6, -L]);
    line([side * (w + 0.18), 5.7, 2], [side * (w + 0.18), 5.7, -L], "pencil");
    for (let z = 0; z >= -L; z -= 4) {
      column(side * (w + 0.35), z);
      line([side * w, 5.8, z], [0, 6.25, z], "pencil");
      line([side * w, 1, z], [side * w, 1.6, z], "guide");
    }
  }
  for (let z = 0; z >= -L; z -= 4) {
    arch(0, 0, z, o.width + 0.45, 6.1);
    arch(0, 0, z - 0.09, o.width + 0.62, 6.2);
    line([-w, 5.7, z], [w, 5.7, z], "pencil");
  }
  // Sparse graphite patches on the floor respond to the selected light direction.
  const a = (o.light * Math.PI) / 180;
  for (let i = 0; i < 180 * o.density; i++) {
    const x = (seed(i + 90) - 0.5) * o.width,
      z = -seed(i + 290) * L;
    if (seed(i + 670) < 0.48) continue;
    const len = 0.18 + seed(i) * 0.8;
    line(
      [x, 0.006, z],
      [x + Math.cos(a) * len, 0.006, z + Math.sin(a) * len],
      "hatch",
      0.02,
    );
  }
  for (let z = 1; z >= -L; z -= 1) {
    line([-w - 0.65, 0.02, z], [-w - 0.45, 0.02, z], "guide");
    line([w + 0.45, 0.02, z], [w + 0.65, 0.02, z], "guide");
  }
  // Small mechanisms give the reflections recognizable, asymmetric spatial landmarks.
  box(-1.8, 0, -3.8, 0.8, 1.2, 0.65, "pencil");
  gear(-1.4, 1.85, -3.9, 0.55);
  gear(-0.78, 1.55, -4.02, 0.31);
  line([-1.4, 1.85, -4.3], [-1.4, 2.65, -4.3], "pencil");
  box(1.5, 0, -10, 0.65, 1.1, 0.65, "pencil");
  gear(1.82, 1.7, -10.13, 0.43);
  ring(1.82, 2.65, -10.3, 0.18);
  line([1.82, 2.65, -10.3], [2.2, 1.6, -10.3]);
  ring(2.2, 1.6, -10.3, 0.1);
  // End chamber is real geometry, reached through a narrow doorway in physical presets.
  arch(0, 0, -L + 7, 4.5, 5.7);
  arch(0, 0, -L + 7.15, 4.7, 5.8);
  for (const x of [-2, 2]) {
    box(x - 0.2, 0, -L + 0.5, 0.4, 3, 0.4, "pencil");
    ring(x, 3.6, -L + 0.25, 0.5, "pencil");
  }
  ring(0, 0.012, -L + 1, 2.5, "pencil", "xz");
  ring(0, 0.014, -L + 1, 2.65, "guide", "xz");
  const definitions = mirrorDefinitions(o);
  for (const m of definitions) {
    transform = new THREE.Matrix4().makeRotationY(m.rotation);
    transform.setPosition(...m.position);
    for (const pad of [0, 0.09, 0.16])
      rect(
        -m.width / 2 - pad,
        -m.height / 2 - pad,
        0.016 + pad * 0.015,
        m.width + pad * 2,
        m.height + pad * 2,
        pad === 0.09 ? "pencil" : "ink",
      );
    const top = m.height / 2 + 0.2;
    arch(0, top, 0.025, 1.3, 0.65);
    for (let i = 0; i < o.density * 18; i++) {
      const y = -m.height / 2 + (i / (o.density * 18)) * m.height;
      line(
        [-m.width / 2 - 0.15, y, 0.026],
        [-m.width / 2 - 0.03, y + 0.08, 0.026],
        "hatch",
      );
      line(
        [m.width / 2 + 0.03, y, 0.026],
        [m.width / 2 + 0.15, y + 0.08, 0.026],
        "hatch",
      );
    }
    for (const x of [-m.width / 2, m.width / 2])
      for (const y of [-m.height / 2, m.height / 2]) {
        line([x - 0.18, y, 0.04], [x + 0.18, y, 0.04], "guide");
        line([x, y - 0.18, 0.04], [x, y + 0.18, 0.04], "guide");
      }
    transform.identity();
  }
  // The gallery's remote chamber is deliberately different, never called a reflection.
  if (o.version === "gallery") {
    transform.makeRotationY(Math.PI);
    transform.setPosition(48, 0, 0);
    for (let z = 0; z >= -18; z -= 3) {
      arch(0, 0, z, 7.4, 6.3);
      for (const x of [-3.6, 3.6]) column(x, z, 6.2);
      line([-4, 0, z], [4, 0, z], "pencil");
    }
    for (let x = -4; x <= 4; x++) line([x, 0, 1], [x, 0, -18], "pencil");
    for (let i = 0; i < 7; i++) {
      const x = (i % 2 ? 1 : -1) * 1.5;
      box(x - 0.25, 0.05, -3 - i * 1.7, 0.5, 1.2 + i * 0.25, 0.5, "pencil");
      gear(x, 2.1 + i * 0.25, -3 - i * 1.7, 0.35);
    }
    transform.identity();
  }
  const materials = {
    ink: new THREE.LineBasicMaterial({
      color: "#514b40",
      transparent: true,
      opacity: 0.77,
    }),
    pencil: new THREE.LineBasicMaterial({
      color: "#776c59",
      transparent: true,
      opacity: 0.38,
    }),
    hatch: new THREE.LineBasicMaterial({
      color: "#71634e",
      transparent: true,
      opacity: 0.25,
    }),
    guide: new THREE.LineBasicMaterial({
      color: "#9b8a70",
      transparent: true,
      opacity: 0.23,
    }),
  };
  for (const [key, positions] of Object.entries(arrays)) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const lines = new THREE.LineSegments(geometry, materials[key]);
    lines.name = key;
    root.add(lines);
    resources.push(geometry, materials[key]);
    if (key === "guide") lines.visible = o.guides;
  }
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(o.width + 3, o.length + 18),
    new THREE.MeshBasicMaterial({
      color: "#eee8da",
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.014, -o.length / 2 + 1);
  root.add(floor);
  resources.push(floor.geometry, floor.material);
  if (o.version === "gallery") {
    const remote = floor.clone();
    remote.position.set(48, -0.014, 8);
    root.add(remote);
  }
  return {
    root,
    definitions,
    segments: count,
    setGuides(visible) {
      root.getObjectByName("guide").visible = visible;
    },
    dispose() {
      resources.forEach((r) => r.dispose());
      root.clear();
    },
  };
}
