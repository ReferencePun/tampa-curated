import assert from "node:assert/strict";
import * as THREE from "three";
import {
  reflectPoint,
  reflectedCamera,
  planeOf,
  clipCamera,
  portalMapping,
  portalCamera,
  sampleJourney,
  mirrorDefinitions,
  options,
  qualityProfile,
} from "../src/creative-lab/experiments/hall-of-mirrors/model.js";
import { createCorridor } from "../src/creative-lab/experiments/hall-of-mirrors/corridor.js";
const near = (a, b, t = 1e-7) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`),
  vnear = (a, b, t = 1e-7) =>
    assert.ok(a.distanceTo(b) < t, `${a.toArray()} ≠ ${b.toArray()}`);
for (let i = 0; i < 100; i++) {
  const plane = new THREE.Plane(
      new THREE.Vector3(Math.cos(i), 0.1, Math.sin(i)).normalize(),
      (i % 4) - 2,
    ),
    point = new THREE.Vector3(i * 0.1, 3, -i * 0.3),
    reflected = reflectPoint(point, plane);
  near(plane.distanceToPoint(point), -plane.distanceToPoint(reflected));
  vnear(reflectPoint(reflected, plane), point);
  const midpoint = point.clone().add(reflected).multiplyScalar(0.5);
  near(plane.distanceToPoint(midpoint), 0);
}
const camera = new THREE.PerspectiveCamera(56, 1.4, 0.04, 180);
camera.position.set(1, 2, 6);
camera.lookAt(0, 1.5, -5);
camera.updateMatrixWorld();
const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 4),
  reflected = reflectedCamera(camera, plane);
near(reflected.position.x, -9);
near(reflected.position.y, 2);
near(reflected.position.z, 6);
vnear(
  reflected.getWorldDirection(new THREE.Vector3()),
  camera.getWorldDirection(new THREE.Vector3()).reflect(plane.normal),
);
const twice = reflectedCamera(reflected, plane, camera.projectionMatrix);
vnear(twice.position, camera.position);
vnear(
  twice.getWorldDirection(new THREE.Vector3()),
  camera.getWorldDirection(new THREE.Vector3()),
);
const clip = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  viewer = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
viewer.position.set(0, 0, -5);
viewer.lookAt(0, 0, 1);
viewer.updateMatrixWorld();
assert.ok(clipCamera(viewer, clip));
const inside = new THREE.Vector3(0, 0, 1).project(viewer),
  outside = new THREE.Vector3(0, 0, -1).project(viewer);
assert.ok(inside.z >= -1 && inside.z < 1);
assert.ok(outside.z < -1, "Geometry behind the mirror plane is clipped");
for (const version of ["parallel", "maze", "gallery"]) {
  const frames = Array.from({ length: 1001 }, (_, i) =>
    sampleJourney(i / 1000, { version }),
  );
  for (let i = 1000; i >= 0; i--) {
    const pose = sampleJourney(i / 1000, { version });
    vnear(pose.position, frames[i].position);
    vnear(pose.target, frames[i].target);
    assert.equal(pose.up.x, 0);
    assert.equal(pose.up.z, 0);
    if (version !== "gallery" && i > 0)
      assert.ok(
        pose.position.distanceTo(frames[i - 1].position) < 0.07,
        "Smooth bounded camera travel",
      );
  }
  const definitions = mirrorDefinitions({ version });
  assert.equal(
    definitions.filter((x) => x.kind === "portal").length,
    version === "gallery" ? 1 : 0,
  );
  for (const quality of ["low", "medium", "high", "auto"]) {
    const p = qualityProfile(quality);
    assert.ok(p.budget <= 16);
    assert.ok(p.size <= 768);
  }
}
// Registration across the artistic portal: mapping a source-plane point and camera preserves its screen position.
const source = new THREE.Object3D(),
  destination = new THREE.Object3D();
source.position.set(0, 2.8, -21);
destination.position.set(48, 2.8, 0);
const mapping = portalMapping(source, destination);
camera.position.set(0.3, 2.55, -20);
camera.lookAt(0.3, 2.55, -25);
camera.updateMatrixWorld();
const portal = portalCamera(camera, mapping),
  point = new THREE.Vector3(0.5, 2, -21);
vnear(
  point.clone().project(camera),
  point.clone().applyMatrix4(mapping).project(portal),
);
for (const version of ["parallel", "maze", "gallery"])
  for (const density of [1, 3]) {
    const hall = createCorridor({ version, density });
    assert.ok(hall.segments > 3000);
    assert.ok(
      hall.root.children.length < 8,
      "Batched linework keeps draw calls bounded",
    );
    for (const child of hall.root.children) {
      const a = child.geometry?.attributes.position;
      if (a) assert.ok([...a.array].every(Number.isFinite));
    }
    hall.dispose();
    assert.equal(hall.root.children.length, 0);
  }
for (const angle of [-30, 0, 30]) {
  const pair = mirrorDefinitions({ version: "parallel", angle })
    .slice(0, 2)
    .map((d) => {
      const o = new THREE.Object3D();
      o.rotation.y = d.rotation;
      return planeOf(o).normal;
    });
  near(pair[0].dot(pair[1]), -1);
}
const parent = new THREE.Group();
parent.position.set(5, 0, 0);
parent.add(camera);
parent.updateMatrixWorld(true);
const fromParent = reflectedCamera(camera, plane);
vnear(
  fromParent.position,
  reflectPoint(camera.getWorldPosition(new THREE.Vector3()), plane),
);
parent.remove(camera);
assert.equal(options({ depth: 99 }).depth, 4);
assert.equal(qualityProfile("low").depthCap, 1);
assert.equal(qualityProfile("auto", 1000, 2).depthCap, 1);
const object = new THREE.Object3D();
object.position.x = 3;
object.rotation.y = Math.PI / 2;
near(planeOf(object).distanceToPoint(new THREE.Vector3(3, 0, 1)), 0);
console.log(
  "Hall: reflection involution, camera direction, mirror-plane clipping, 3,003 reversible journey poses, portal projection registration, bounded quality, finite geometry and disposal passed.",
);
