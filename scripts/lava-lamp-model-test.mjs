import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULTS,
  PRESETS,
  WaxField,
  sampleField,
  options,
  wall,
} from "../src/creative-lab/experiments/lava-lamp/model.js";
assert.deepEqual(
  JSON.parse(
    await readFile("src/creative-lab/experiments/lava-lamp/config.json"),
  ),
  DEFAULTS,
);
const a = new WaxField(),
  b = new WaxField();
for (let i = 0; i < 600; i++) a.advance(1 / 60);
for (let i = 0; i < 300; i++) b.advance(1 / 30);
assert.ok(Math.abs(a.time - b.time) < 1e-8);
assert.deepEqual(a.parcels, b.parcels);
// Two continuous fields join at their neck and separate without replacing geometry.
const parcel = (x) => ({
  x,
  y: 1.2,
  rx: 0.24,
  ry: 0.28,
  angle: 0,
  temperature: 0.6,
});
const close = [parcel(-0.16), parcel(0.16)],
  far = [parcel(-0.38), parcel(0.38)];
assert.ok(sampleField(0, 1.2, close).density > 1);
assert.ok(sampleField(0, 1.2, far).density < 1);
const p = sampleField(0.11, 1.25, close),
  epsilon = 1e-5;
assert.ok(
  Math.abs(
    p.gx -
      (sampleField(0.11 + epsilon, 1.25, close).density -
        sampleField(0.11 - epsilon, 1.25, close).density) /
        (2 * epsilon),
  ) < 1e-5,
);
function run(settings, seconds = 30) {
  const f = new WaxField(settings);
  for (let i = 0; i < seconds * 60; i++) f.advance(1 / 60);
  return f;
}
const normal = run(DEFAULTS);
for (const [key, value] of [
  ["viscosity", 1.8],
  ["rise", 1.8],
  ["merge", 0],
  ["split", 2],
  ["speed", 2],
]) {
  const f = run({ ...DEFAULTS, [key]: value });
  assert.notDeepEqual(
    f.parcels,
    normal.parcels,
    `${key} must change the model`,
  );
}
assert.ok(
  sampleField(0, 1.2, close, 2).density > sampleField(0, 1.2, close, 0).density,
);
let pooled = false;
let directions = new Set(),
  minY = Infinity,
  maxY = 0;
const long = new WaxField();
for (let i = 0; i < 900 * 60; i++) {
  long.advance(1 / 60);
  if (i % 600 === 0) {
    assert.ok(Math.abs(long.snapshot().mass - 1.12) < 1e-10);
    for (const p of long.parcels) {
      for (const k of ["x", "y", "vx", "vy", "rx", "ry", "temperature"])
        assert.ok(Number.isFinite(p[k]));
      assert.ok(p.y >= 0 && p.y <= 2.4);
      assert.ok(Math.abs(p.x) <= wall(p.y) + 0.001);
      assert.ok(p.temperature >= 0 && p.temperature <= 1);
      if (p.y < 0.2 && p.ry < p.rx * 0.9) pooled = true;
    }
    if (i > 300 * 60) {
      const p = long.parcels[0];
      directions.add(Math.sign(p.vy));
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
}
assert.ok(pooled, "Wax must compress while pooling near the heater");
assert.ok(
  directions.has(-1) && directions.has(1),
  "Wax must keep rising and falling after five minutes",
);
assert.ok(
  maxY - minY > 1,
  "Long-running circulation must not collapse into an equilibrium ball",
);
for (const p of Object.values(PRESETS)) {
  assert.deepEqual(options(p.settings), p.settings);
  const f = run(p.settings, 2);
  assert.equal(f.parcels.length, p.settings.blobs);
  assert.ok(f.parcels.every((p) => p.rx > 0 && p.ry > 0));
}
a.update({ ...DEFAULTS, blobs: 24 });
assert.equal(a.parcels.length, 24);
assert.equal(a.time, 0);
const initial = new WaxField();
a.update(DEFAULTS);
assert.deepEqual(a.parcels, initial.parcels);
a.advance(NaN);
assert.equal(a.time, 0);
console.log(
  "Wax model: deterministic fixed steps, connected merge/split field, analytic gradients, parameter effects, bounds, conserved parcel mass, presets and fifteen minutes of sustained circulation passed.",
);
