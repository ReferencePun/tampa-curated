import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSettings } from "../src/creative-lab/shared/presets.js";
const manifest = JSON.parse(
  readFileSync(
    new URL(
      "../src/creative-lab/experiments/pin-art/manifest.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
import {
  PinFieldState,
  DEFAULTS,
  PRESETS,
  options,
  gridFor,
  travelFor,
  shapeHeight,
  sampleHeight,
  sampleGrid,
  readField,
} from "../src/creative-lab/experiments/pin-art/model.js";
import { pinGeometry } from "../src/creative-lab/experiments/pin-art/geometry.js";
assert.doesNotThrow(() =>
  validateSettings(
    manifest,
    options({ rotation: 34.3893, tilt: 12.8723, zoom: 1.23456 }),
  ),
);
for (const preset of Object.values(PRESETS))
  assert.deepEqual(options(preset.settings), preset.settings);
for (const density of [32, 80, 128]) {
  const g = gridFor(density);
  assert.equal(g.count, g.columns * g.rows);
  assert.ok(g.count <= 10880);
  const geo = pinGeometry(g.pitch, 2.5);
  geo.computeBoundingBox();
  assert.ok(geo.boundingBox.max.z > 1.24);
  assert.ok(geo.boundingBox.min.z < -1.24);
  assert.ok([...geo.attributes.position.array].every(Number.isFinite));
  geo.dispose();
}
for (const pinLength of [1.2, 2.5, 3.6])
  for (const boardDepth of [0.15, 0.65, 1]) {
    const travel = travelFor({ ...DEFAULTS, pinLength, boardDepth });
    assert.ok(pinLength / 2 - travel >= boardDepth / 2 + 0.089);
    assert.ok(-pinLength / 2 + travel <= -boardDepth / 2 - 0.089);
  }
assert.equal(shapeHeight("sphere", 0, 0), 1);
assert.equal(shapeHeight("sphere", 1.1, 0), 0);
assert.equal(shapeHeight("ring", 0, 0), 0);
assert.ok(shapeHeight("ring", 0.64, 0) > 0.99);
assert.equal(shapeHeight("cube", 0.5, 0.5), 1);
assert.equal(shapeHeight("star", 3, 0), 0);
const model = new PinFieldState({
  ...DEFAULTS,
  sample: "blank",
  strength: 1,
  smoothing: 0,
});
model.press([0, 0]);
assert.ok(Math.max(...model.raw) > 0.9);
for (let i = 0; i < 150; i++) model.step(1 / 60);
const held = model.statistics().energy;
model.releasePointer();
for (let i = 0; i < 80; i++) model.step(1 / 60);
assert.equal(model.statistics().energy, held, "Held impressions persist");
model.clear();
for (let i = 0; i < 200; i++) model.step(1 / 60);
assert.equal(model.statistics().energy, 0);
assert.equal(model.step(1 / 60), false);
model.update({ hold: false, direction: "in" });
model.press([0, 0]);
for (let i = 0; i < 60; i++) model.step(1 / 60);
assert.ok(model.statistics().min < -0.9);
model.releasePointer();
for (let i = 0; i < 180; i++) model.step(1 / 60);
assert.equal(model.statistics().energy, 0, "Temporary contact springs back");
model.update({ hold: true, direction: "out" });
model.press([4, 0], [-4, 0]);
model.snap();
for (const x of [-3, -2, -1, 0, 1, 2, 3])
  assert.ok(
    model.valueAt(x, 0) > 0.85,
    "Fast strokes interpolate without gaps",
  );
const before = model.valueAt(0, 0);
model.update({ density: 128 });
model.snap();
assert.ok(Math.abs(model.valueAt(0, 0) - before) < 0.02);
model.clear();
model.setHeightMap({
  width: 3,
  height: 2,
  data: Float32Array.from([0, 0.5, 1, 0, 0.5, 1]),
});
model.snap();
assert.ok(model.valueAt(4, 0) > model.valueAt(-4, 0) + 0.5);
model.setHeightMap(
  { width: 3, height: 2, data: [0, 0.5, 1, 0, 0.5, 1] },
  { invert: true },
);
model.snap();
assert.ok(model.valueAt(-4, 0) > model.valueAt(4, 0) + 0.5);
assert.throws(() =>
  model.setHeightMap({ width: 2, height: 2, data: [0, NaN, 1, 0] }),
);
model.setProcedural((x, y) => Math.sin(x) * Math.cos(y));
model.snap();
const doc = model.serialize(),
  restored = new PinFieldState();
restored.load(doc);
assert.ok(
  Math.abs(restored.statistics().energy - model.statistics().energy) < 1e-6,
);
assert.deepEqual(Array.from(restored.heights), Array.from(model.heights));
assert.throws(() => readField({ ...doc, values: [Infinity] }));
const fast = new PinFieldState({ sample: "blank", spring: 3 }),
  slow = new PinFieldState({ sample: "blank", spring: 0.25 });
fast.press([0, 0]);
slow.press([0, 0]);
fast.step(0.05);
slow.step(0.05);
assert.ok(fast.statistics().max > slow.statistics().max);
for (let i = 0; i < 200; i++) {
  fast.step(0.2);
  assert.ok(fast.heights.every((v) => Number.isFinite(v) && v >= -1 && v <= 1));
}
const a = new PinFieldState({ mode: "wave", autoWave: true }),
  b = new PinFieldState({ mode: "wave", autoWave: true });
for (let i = 0; i < 120; i++) {
  a.step(1 / 60);
  b.step(1 / 60);
}
assert.deepEqual(a.heights, b.heights);
const wave = a.statistics().energy;
a.update({ autoWave: false });
for (let i = 0; i < 120; i++) a.step(1 / 60);
assert.ok(a.statistics().energy > 0);
assert.notEqual(wave, a.statistics().energy);
a.update({ autoWave: true });
a.step(0.05);
assert.ok(a.phase > b.phase);
assert.ok(sampleHeight("palm", 0, -1) > 0.5);
assert.equal(sampleGrid([0, 1, 0, 1], 2, 2, 0.5, 0.5), 0.5);
for (const m of [model, restored, fast, slow, a, b]) m.dispose();
assert.equal(model.heights.length, 0);
console.log(
  "Pin art: bounded physical travel, independent signed contacts, hold/release, gapless strokes, stable spring settling, height-map alignment, density resampling, deterministic waves and relief round trips passed.",
);
