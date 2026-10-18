import assert from "node:assert/strict";
import {
  DEFAULTS,
  PRESETS,
  MATERIALS,
  options,
  pressState,
  signedDepth,
  normalFromGradient,
  lightVector,
  bevelMap,
  grainMap,
} from "../src/creative-lab/experiments/impressed-typography/model.js";
import { readFile } from "node:fs/promises";
import { validateSettings } from "../src/creative-lab/shared/presets.js";
const manifest = JSON.parse(
  await readFile(
    "src/creative-lab/experiments/impressed-typography/manifest.json",
    "utf8",
  ),
);
for (const p of Object.values(PRESETS))
  assert.deepEqual(validateSettings(manifest, p.settings), p.settings);
assert.equal(Object.keys(MATERIALS).length, 6);
assert.equal(signedDepth(DEFAULTS), 5);
assert.equal(signedDepth({ ...DEFAULTS, treatment: "deboss" }), -5);
assert.equal(signedDepth({ ...DEFAULTS, treatment: "letterpress" }), -2.4);
assert.equal(pressState(0).pressure, 0);
assert.equal(pressState(31).pressure, 0);
assert.ok(pressState(50).pressure > 0 && pressState(50).pressure < 1);
assert.equal(pressState(100).pressure, 1);
assert.equal(pressState(100).lift, 1);
const forward = Array.from({ length: 1001 }, (_, i) => pressState(i / 10));
assert.deepEqual(
  forward,
  [...Array(1001)].map((_, i) => pressState((1000 - i) / 10)).reverse(),
);
for (let i = 1; i < 1001; i++)
  assert.ok(forward[i].pressure >= forward[i - 1].pressure);
const raised = normalFromGradient(0.5, 0, 1),
  recessed = normalFromGradient(0.5, 0, -1),
  left = lightVector(180, 32),
  right = lightVector(0, 32),
  dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
assert.ok(dot(raised, left) > dot(recessed, left));
assert.ok(dot(raised, right) < dot(recessed, right));
assert.ok(Math.abs(Math.hypot(...left) - 1) < 1e-12);
const w = 31,
  h = 25,
  alpha = new Uint8Array(w * h);
for (let y = 5; y < 20; y++)
  for (let x = 5; x < 26; x++) alpha[y * w + x] = 255;
const bevel = bevelMap(alpha, w, h, 5);
assert.equal(bevel[0], 0);
assert.equal(bevel[(12 * w + 15) * 4 + 1], 255);
assert.ok(bevel[(12 * w + 5) * 4 + 1] < bevel[(12 * w + 8) * 4 + 1]);
for (const value of bevel) assert.ok(Number.isFinite(value));
const empty = bevelMap(new Uint8Array(w * h), w, h);
assert.equal(
  empty.reduce((sum, v, i) => sum + (i % 4 === 1 ? v : 0), 0),
  0,
);
assert.deepEqual(grainMap(), grainMap());
assert.equal(options({ text: "A".repeat(300) }).text.length, 240);
assert.equal(options({ depth: NaN }).depth, 5);
assert.equal(options({ paper: "javascript:bad" }).paper, DEFAULTS.paper);
console.log(
  "Impression: signed relief normals, reversed light, deterministic press/contact, bevel geometry, seeded fibres, six materials and valid presets passed.",
);
