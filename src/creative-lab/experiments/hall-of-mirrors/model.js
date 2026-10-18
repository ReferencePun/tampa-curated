import * as THREE from "three";
export const DEFAULTS = {
  version: "parallel",
  depth: 3,
  angle: 0,
  width: 8,
  length: 28,
  density: 2,
  brightness: 0.92,
  fade: 0.13,
  progress: 0,
  position: 0,
  light: 35,
  guides: true,
  quality: "auto",
  inspection: false,
};
export const PRESETS = {
  parallel: { name: "Parallel mirrors", settings: DEFAULTS },
  maze: {
    name: "Angled mirror maze",
    settings: { ...DEFAULTS, version: "maze", angle: 18, depth: 3 },
  },
  gallery: {
    name: "Impossible gallery",
    settings: { ...DEFAULTS, version: "gallery", angle: 5, depth: 2 },
  },
};
export const clamp = (x, a = 0, b = 1) =>
  Math.max(a, Math.min(b, Number.isFinite(+x) ? +x : a));
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function options(input = {}) {
  const o = { ...DEFAULTS };
  for (const [k, b] of Object.entries({
    depth: [0, 4],
    angle: [-30, 30],
    width: [6, 12],
    length: [22, 38],
    density: [1, 3],
    brightness: [0.3, 1.3],
    fade: [0, 0.4],
    progress: [0, 100],
    position: [-1.2, 1.2],
    light: [0, 360],
  }))
    o[k] = clamp(input[k] ?? o[k], ...b);
  o.depth = Math.round(o.depth);
  o.density = Math.round(o.density);
  for (const [k, values] of Object.entries({
    version: ["parallel", "maze", "gallery"],
    quality: ["auto", "low", "medium", "high"],
  }))
    if (values.includes(input[k])) o[k] = input[k];
  for (const k of ["guides", "inspection"])
    if (typeof input[k] === "boolean") o[k] = input[k];
  return o;
}
export function mirrorDefinitions(config = {}) {
  const o = options(config),
    w = o.width / 2,
    a = THREE.MathUtils.degToRad(o.angle),
    stretch = o.length / 28;
  const list = [
    {
      id: "west",
      position: [-w, 2.8, -7 * stretch],
      rotation: Math.PI / 2 + a,
      width: 5.4,
      height: 4.9,
    },
    {
      id: "east",
      position: [w, 2.8, -7 * stretch],
      rotation: -Math.PI / 2 + (o.version === "maze" ? -a : a),
      width: 5.4,
      height: 4.9,
    },
    {
      id: "west-deep",
      position: [-w, 2.8, -15 * stretch],
      rotation: Math.PI / 2 + (o.version === "maze" ? -a : a),
      width: 4.6,
      height: 4.9,
    },
    {
      id: "east-deep",
      position: [w, 2.8, -15 * stretch],
      rotation: -Math.PI / 2 + a,
      width: 4.6,
      height: 4.9,
    },
  ];
  if (o.version === "gallery")
    list.push({
      id: "invented-passage",
      kind: "portal",
      position: [0, 2.8, -21 * stretch],
      rotation: 0,
      width: 4.3,
      height: 5.5,
      destination: [48, 2.8, 0],
    });
  return list;
}
/** Reflecting a point twice in the same normalized plane returns the original point. */
export function reflectPoint(point, plane) {
  return point
    .clone()
    .addScaledVector(plane.normal, -2 * plane.distanceToPoint(point));
}
export function planeOf(object) {
  object.updateWorldMatrix(true, false);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(
      object.matrixWorld,
    ),
    point = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);
}
export function reflectedCamera(
  source,
  plane,
  projection = source.projectionMatrix,
) {
  source.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(
    source.fov,
    source.aspect,
    source.near,
    source.far,
  );
  const forward = source.getWorldDirection(new THREE.Vector3()),
    up = new THREE.Vector3().setFromMatrixColumn(source.matrixWorld, 1);
  camera.position.copy(
    reflectPoint(source.getWorldPosition(new THREE.Vector3()), plane),
  );
  camera.up.copy(up.reflect(plane.normal));
  camera.lookAt(camera.position.clone().add(forward.reflect(plane.normal)));
  camera.projectionMatrix.copy(projection);
  camera.projectionMatrixInverse.copy(projection).invert();
  camera.updateMatrixWorld(true);
  return camera;
}
/** Oblique near-plane clipping; derived from Eric Lengyel's method used by Three.js Reflector. */
export function clipCamera(camera, worldPlane, bias = 0.001) {
  const p = worldPlane.clone().applyMatrix4(camera.matrixWorldInverse),
    c = new THREE.Vector4(p.normal.x, p.normal.y, p.normal.z, p.constant),
    e = camera.projectionMatrix.elements,
    q = new THREE.Vector4(
      (Math.sign(c.x) + e[8]) / e[0],
      (Math.sign(c.y) + e[9]) / e[5],
      -1,
      (1 + e[10]) / e[14],
    ),
    den = c.dot(q);
  if (Math.abs(den) < 1e-7) return false;
  c.multiplyScalar(2 / den);
  e[2] = c.x;
  e[6] = c.y;
  e[10] = c.z + 1 - bias;
  e[14] = c.w;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  return true;
}
export function portalMapping(source, destination) {
  source.updateWorldMatrix(true, false);
  destination.updateWorldMatrix(true, false);
  return new THREE.Matrix4()
    .copy(destination.matrixWorld)
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI))
    .multiply(source.matrixWorld.clone().invert());
}
export function portalCamera(
  source,
  mapping,
  projection = source.projectionMatrix,
) {
  source.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(
      source.fov,
      source.aspect,
      source.near,
      source.far,
    ),
    world = new THREE.Matrix4().multiplyMatrices(mapping, source.matrixWorld);
  world.decompose(camera.position, camera.quaternion, camera.scale);
  camera.updateMatrixWorld(true);
  camera.projectionMatrix.copy(projection);
  camera.projectionMatrixInverse.copy(projection).invert();
  return camera;
}
export function sampleJourney(progress, config = {}, pointer = [0, 0]) {
  const o = options(config),
    p = clamp(progress),
    s = o.length / 28;
  let z = 8 - (8 + o.length - 2) * smooth(0, 1, p),
    x = o.position + 0.35 * Math.sin(p * Math.PI) * smooth(0.15, 0.45, p),
    y = 2.55 + 0.12 * Math.sin(p * Math.PI),
    yaw = 0.92 * (smooth(0.42, 0.66, p) - smooth(0.7, 0.84, p));
  const inspection = o.inspection ? pointer : [0, 0];
  yaw += inspection[0] * 0.22;
  let position = new THREE.Vector3(x, y, z),
    target = new THREE.Vector3(
      x + Math.sin(yaw) * 4,
      y + inspection[1] * 0.65,
      z - Math.cos(yaw) * 4,
    );
  let chamber = "hall";
  if (o.version === "gallery" && z < -21 * s + 0.06) {
    const src = new THREE.Object3D(),
      dest = new THREE.Object3D();
    src.position.set(0, 2.8, -21 * s);
    dest.position.set(48, 2.8, 0);
    const m = portalMapping(src, dest);
    position.applyMatrix4(m);
    target.applyMatrix4(m);
    chamber = "invented";
  }
  return {
    position,
    target,
    up: new THREE.Vector3(0, 1, 0),
    phase:
      p < 0.14
        ? "At the threshold"
        : p < 0.4
          ? "The first reflected rooms"
          : p < 0.64
            ? "Between the looking glasses"
            : p < 0.79
              ? "A passage inside a passage"
              : p < 0.9
                ? "Beyond the last frame"
                : "The other chamber",
    chamber,
  };
}
export function qualityProfile(quality, width = 1000, adaptive = 0) {
  const base =
    quality === "low"
      ? 256
      : quality === "high"
        ? 768
        : quality === "medium"
          ? 512
          : width < 600
            ? 320
            : 512;
  return {
    size: Math.max(160, Math.round(base / 2 ** adaptive)),
    depthCap: quality === "low" || adaptive >= 2 ? 1 : 4,
    budget: quality === "low" ? 5 : quality === "high" ? 16 : 12,
    pixelRatio: quality === "high" ? 1.7 : quality === "low" ? 1 : 1.35,
  };
}
