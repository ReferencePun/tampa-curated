import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  SpinArt,
  DEFAULTS,
  PRESETS,
  STEP,
  paperPoint,
  screenPoint,
  readArtwork,
} from "../src/creative-lab/experiments/spin-art/model.js";
import { makeStudy } from "../src/creative-lab/experiments/spin-art/studies.js";
import { svgArtwork } from "../src/creative-lab/experiments/spin-art/paint.js";
import { validateSettings } from "../src/creative-lab/shared/presets.js";
const manifest = JSON.parse(
  await readFile("src/creative-lab/experiments/spin-art/manifest.json"),
);
assert.deepEqual(
  DEFAULTS,
  JSON.parse(
    await readFile("src/creative-lab/experiments/spin-art/config.json"),
  ),
);
for (const p of Object.values(PRESETS)) validateSettings(manifest, p.settings);
for (const a of [0, 0.2, Math.PI, -2.3]) {
  const p = paperPoint(0.4, -0.6, a),
    s = screenPoint(...p, a);
  assert.ok(Math.abs(s[0] - 0.4) < 1e-10 && Math.abs(s[1] + 0.6) < 1e-10);
}
function run(config = {}, dt = STEP, seconds = 1) {
  const m = new SpinArt(config);
  m.setMotor(true);
  m.begin(0.5, 0);
  for (let i = 0; i < Math.round(seconds / dt); i++) m.advance(dt);
  m.end();
  return m;
}
const cw = run({ style: "marker" }),
  ccw = run({ style: "marker", direction: "counterclockwise" });
assert.ok(cw.angle > 0 && ccw.angle < 0);
assert.ok(
  Math.abs(cw.marks[20][4] + ccw.marks[20][4]) < 1e-5,
  "Reversing motor mirrors the paper-space trajectory",
);
const fixed = new SpinArt({ style: "marker" });
fixed.begin(0.5, 0);
for (let i = 0; i < 120; i++) fixed.advance(STEP);
assert.ok(fixed.marks.every((m) => Math.abs(m[1] - 0.5) < 1e-5 && m[2] === 0));
assert.ok(
  cw.marks.some((m) => Math.abs(m[2]) > 0.4),
  "A still hand draws a real arc on moving paper",
);
const single = run({ style: "dots", dripRate: 4, spread: 0 }),
  many = run({ style: "dots", dripRate: 60, spread: 0 });
assert.ok(many.marks.length > single.marks.length * 5);
const dry = run({ style: "stream", spread: 0 }),
  wet = run({ style: "stream", spread: 1 });
assert.equal(dry.wet.length, 0);
assert.ok(wet.marks.length > dry.marks.length);
const before = wet.marks.length;
for (let i = 0; i < 120; i++) wet.advance(STEP);
assert.ok(wet.marks.length > before, "Wet paint continues after hand release");
// Single measured deposits distinguish rotation-driven flow from decorative trails.
function throwDrop(speed, viscosity, direction = "clockwise") {
  const m = new SpinArt({
    style: "dots",
    speed,
    spread: 1,
    viscosity,
    thickness: 18,
    direction,
  });
  m.setMotor(true);
  for (let i = 0; i < 120; i++) m.advance(STEP);
  m.angle = 0;
  m.begin(0.35, 0);
  m.end();
  for (let i = 0; i < 360; i++) m.advance(STEP);
  return m;
}
const still = throwDrop(0, 0.15),
  slow = throwDrop(20, 0.15),
  fast = throwDrop(70, 0.15),
  thick = throwDrop(70, 0.9),
  reverse = throwDrop(70, 0.15, "counterclockwise");
const radius = (m) => Math.max(...m.marks.map((v) => Math.hypot(v[3], v[4])));
assert.ok(
  radius(still) < 0.351,
  "Stopped paint pools rather than acquiring artificial outward motion",
);
assert.ok(
  radius(slow) > radius(still) + 0.05 && radius(fast) > 1,
  "Spin speed drives outward flow and edge ejection",
);
assert.ok(
  radius(fast) > radius(thick) + 0.2,
  "Viscosity changes the underlying paint travel",
);
assert.ok(
  fast.spills.length > 0 && slow.spills.length === 0,
  "Only paint reaching the edge splashes into the tray",
);
assert.ok(
  Math.abs(radius(fast) - radius(reverse)) < 0.03,
  "Reverse spin still flings paint outward",
);
assert.ok(
  fast.marks.some((v) => v[8] === "ribbon" && v[9] < v[5]),
  "Stretched paint forms tapered bodies",
);
const pool = new SpinArt({ style: "stream", speed: 0, spread: 0 });
pool.begin(0.1, 0);
for (let i = 0; i < 120; i++) pool.advance(STEP);
const beads = pool.marks.filter((m) => m[8] === "bead");
assert.ok(
  beads.at(-1)[5] > beads[0][5] * 1.4,
  "A stationary pour builds an expanding puddle",
);
const largePool = new SpinArt({
  style: "stream",
  speed: 0,
  thickness: 30,
  spread: 0,
});
largePool.begin(0.1, 0);
for (let i = 0; i < 480; i++) largePool.advance(STEP);
readArtwork(largePool.serialize());
const legacy = new SpinArt();
legacy.load({
  type: "spin-art",
  version: 1,
  settings: { speed: 30 },
  angle: 0,
  marks: [[1, 0, 0, 0.1, 0, 0.02, "#123456", 1, "line"]],
});
assert.equal(legacy.marks.length, 1, "Earlier artwork remains importable");
const merging = new SpinArt();
merging.spawn(0.3, 0, 0.03, "#123456", 1, 1, 20000, 1);
merging.spawn(0.3, 0.001, 0.03, "#123456", 1, 1, 20001, 1);
assert.equal(
  merging.wet.length,
  1,
  "Fresh neighboring drops coalesce regardless of sequence number",
);
assert.ok(merging.wet[0].w > 0.03);
const branch = merging.spawn(0.3, 0, 0.01, "#123456", 1, 1, 39031, 1, false);
assert.equal(merging.wet.length, 2);
assert.equal(
  branch,
  merging.wet[1],
  "A split finger remains independently animated",
);
const one = run({ colors: 1, style: "marker" }),
  four = run({ colors: 4, style: "marker" });
assert.equal(four.marks.length, one.marks.length * 4);
assert.equal(new Set(four.marks.map((m) => m[6])).size, 4);
const states = [1 / 30, 1 / 60, STEP].map((dt) =>
  run({ style: "splatter" }, dt),
);
assert.deepEqual(states[0].marks, states[1].marks);
assert.deepEqual(states[1].marks, states[2].marks);
const signatures = new Set();
for (const style of ["marker", "stream", "dots", "splatter", "bloom"]) {
  const m = run({ style });
  signatures.add(JSON.stringify(m.marks));
  assert.ok(m.marks.length > 1);
}
assert.equal(signatures.size, 5);
const m = run({ style: "marker" }),
  keep = m.marks.length;
m.begin(0.7, 0);
m.advance(0.1);
m.end();
const total = m.marks.length;
assert.ok(total > keep);
m.undo();
assert.equal(m.state().visible, keep);
m.redo();
assert.equal(m.state().visible, total);
m.setMotor(false);
const angle = m.angle;
m.advance(0.1);
assert.equal(m.angle, angle);
const saved = m.serialize(),
  restored = new SpinArt();
restored.load(saved);
assert.deepEqual(restored.serialize(), saved);
assert.equal(restored.motor, false);
assert.equal(restored.autoArmed, false);
const old = JSON.stringify(restored.marks);
restored.update({ palette: "electric", paperSize: 2048 });
assert.equal(
  JSON.stringify(restored.marks),
  old,
  "Appearance settings do not recolor or reposition paint",
);
const auto = new SpinArt();
auto.setMotor(true);
auto.setAuto(true);
for (let i = 0; i < 300; i++) auto.advance(STEP);
assert.ok(auto.marks.length > 300);
auto.setAuto(false);
auto.setMotor(false);
for (let i = 0; i < 420; i++) auto.advance(STEP);
assert.equal(auto.wet.length, 0);
const stopped = auto.marks.length;
auto.advance(0.1);
assert.equal(auto.marks.length, stopped);
for (const key of ["flare", "tide", "nocturne"]) {
  const doc = makeStudy(key);
  assert.ok(doc.marks.length > 1000 && doc.marks.length < 12000);
  readArtwork(doc);
  assert.ok(svgArtwork(doc).includes('clip-path="url(#disc)"'));
  assert.deepEqual(makeStudy(key), doc);
}
assert.throws(() => readArtwork({ ...saved, version: 99 }));
assert.throws(() =>
  readArtwork({
    ...saved,
    marks: [[0, 0, 0, 0, 0, 0.1, "url(bad)", 1, "line"]],
  }),
);
assert.throws(() => readArtwork({ ...saved, angle: Infinity }));
assert.throws(() => m.advance(-1));
console.log(
  "Spin-art model: coordinate registration, mirrored direction, distinct pigments, drip rate, spread/drying, multicolor, deterministic time, undo/redo, faithful serialization, sharp resize and original study generation passed.",
);
