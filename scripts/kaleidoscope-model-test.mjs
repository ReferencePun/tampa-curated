import assert from "node:assert/strict";
import {
  DEFAULTS,
  PRESETS,
  options,
  createState,
  foldPoint,
  sectorTransform,
  validateDocument,
  objectPosition,
} from "../src/creative-lab/experiments/kaleidoscope/model.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
for (const n of [3, 5, 7, 16])
  for (const r of [0.02, 0.3, 0.8, 1])
    for (const rotation of [0, 93, 360]) {
      const c = { ...DEFAULTS, mirrors: n, rotation },
        t = { source: 12, rotation: 31 },
        a = (0.3 * Math.PI) / n,
        base = foldPoint(
          r * Math.cos(a + ((rotation + 31) * Math.PI) / 180),
          r * Math.sin(a + ((rotation + 31) * Math.PI) / 180),
          c,
          t,
        );
      for (let i = 0; i < n * 2; i++) {
        const tr = sectorTransform(i, c, t),
          angle = tr.angle + a * tr.flip,
          p = foldPoint(r * Math.cos(angle), r * Math.sin(angle), c, t);
        close(p.x, base.x);
        close(p.y, base.y);
      }
    }
for (const preset of Object.values(PRESETS))
  assert.deepEqual(options(preset.settings), preset.settings);
const s = createState(31),
  c = options(),
  p = foldPoint(0.7, 0.15, c);
assert.deepEqual(s, createState(31));
assert.notDeepEqual(s.objects, createState(32).objects);
assert.notDeepEqual(p, foldPoint(0.7, 0.15, { ...c, zoom: 2 }));
assert.notDeepEqual(p, foldPoint(0.7, 0.15, { ...c, rotation: 25 }));
assert.deepEqual(p, foldPoint(0.7, 0.15, { ...c, rotation: 360 }));
assert.notDeepEqual(
  objectPosition(s.objects[0], 0, "glass"),
  objectPosition(s.objects[0], 10, "glass"),
);
for (let x = -3; x < 3; x += 0.1)
  for (let y = -3; y < 3; y += 0.4) {
    const p = foldPoint(x, y, { ...c, zoom: 0.6 });
    assert.ok(p.x >= -1 && p.x <= 1 && p.y >= -1 && p.y <= 1);
  }
s.strokes = [
  {
    color: "#a67c34",
    width: 5,
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
    ],
  },
];
s.objects[3].dx = 0.4;
s.pan.x = 0.3;
s.time = { source: 40, rotation: 165 };
const doc = {
    type: "impossible-kaleidoscope",
    version: 1,
    config: c,
    state: s,
    image: null,
  },
  read = validateDocument(JSON.parse(JSON.stringify(doc)));
assert.deepEqual(read.state, s);
assert.deepEqual(read.config, c);
read.state.strokes[0].points[0].x = 0.7;
assert.equal(s.strokes[0].points[0].x, 0.1);
for (const bad of [
  { ...doc, version: 2 },
  { ...doc, image: "https://example.org/image.png" },
  { ...doc, state: { ...s, pan: { x: Infinity, y: 0 } } },
  {
    ...doc,
    state: { ...s, strokes: [{ color: "url(evil)", width: 5, points: [] }] },
  },
  { ...doc, state: { ...s, objects: [] } },
])
  assert.throws(() => validateDocument(bad));
assert.equal(
  options({ mirrors: 900, zoom: -1, source: "no", ink: "red" }).mirrors,
  16,
);
assert.equal(options({ zoom: -1 }).zoom, 0.6);
assert.equal(options({ rotation: NaN }).rotation, 0);
console.log(
  "Kaleidoscope: all mirror/reflection invariants, mirrored texture boundaries, deterministic sources, controls, presets and composition validation passed.",
);
