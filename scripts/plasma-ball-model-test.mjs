import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULTS,
  PRESETS,
  PlasmaField,
  options,
  contactPoint,
  project,
} from "../src/creative-lab/experiments/plasma-ball/model.js";
assert.deepEqual(
  JSON.parse(
    await readFile("src/creative-lab/experiments/plasma-ball/config.json"),
  ),
  DEFAULTS,
);
const a = new PlasmaField(),
  b = new PlasmaField();
function signature(f) {
  return f.paths.map((p) => Array.from(p.points));
}
assert.deepEqual(signature(a), signature(b));
const start = signature(a);
for (let n = 0; n < 90; n++) {
  a.advance(1 / 60);
  b.advance(1 / 60);
}
assert.deepEqual(signature(a), signature(b));
assert.notDeepEqual(signature(a), start);
for (const p of a.paths) {
  assert.ok(p.points.every(Number.isFinite));
  if (p.branch) {
    const j = Math.round(p.fork * 56);
    assert.deepEqual(
      Array.from(p.points.slice(0, 3)),
      Array.from(p.parent.points.slice(j * 3, j * 3 + 3)),
    );
  } else assert.ok(Math.abs(Math.hypot(...p.end) - 1) < 1e-8);
}
for (const [x, y] of [
  [0, 0],
  [0.5, 0.2],
  [-0.85, 0.1],
  [0.2, -0.8],
]) {
  const p = project(contactPoint(x, y));
  assert.ok(Math.hypot(p[0] - x, p[1] - y) < 1e-5);
}
a.point(0.65, -0.35);
a.settleInput();
assert.ok(a.meanContactDistance < 0.12, a.meanContactDistance);
const gathered = signature(a);
a.release();
for (let i = 0; i < 100; i++) a.advance(1 / 60);
assert.ok(a.contact.amount < 0.0001);
assert.ok(a.meanContactDistance > 0.5);
assert.notDeepEqual(gathered, signature(a));
a.update({ ...DEFAULTS, attraction: 0 });
a.point(0.65, -0.35, true);
a.settleInput();
assert.ok(a.meanContactDistance > 0.5);
const classic = new PlasmaField(),
  intense = new PlasmaField({ ...DEFAULTS, mode: "intense" });
for (const f of [classic, intense]) {
  f.point(0.5, 0.2);
  f.settleInput();
}
assert.ok(intense.paths[0].width > classic.paths[0].width);
const hoverWidth = classic.paths[0].width,
  hoverStrength = classic.paths[0].strength;
classic.point(0.5, 0.2, true);
classic.settleInput();
assert.ok(classic.paths[0].width > hoverWidth);
assert.ok(classic.paths[0].strength > hoverStrength);
classic.point(NaN, Infinity);
classic.settleInput();
classic.advance(NaN);
assert.ok(classic.paths.every((p) => p.points.every(Number.isFinite)));
assert.equal(classic.contact.amount, 0);
const ambient = new PlasmaField({ ...DEFAULTS, mode: "ambient" });
classic.reset();
classic.advance(0.05);
ambient.advance(0.05);
assert.ok(ambient.time < classic.time * 0.4);
const quiet = new PlasmaField({ ...DEFAULTS, idle: false });
quiet.advance(0.05);
assert.equal(quiet.time, 0);
quiet.point(0.8, 0);
quiet.advance(0.05);
assert.ok(quiet.time > 0);
for (const preset of Object.values(PRESETS)) {
  assert.deepEqual(options(preset.settings), preset.settings);
  const f = new PlasmaField(preset.settings);
  assert.equal(
    f.paths.length,
    preset.settings.filaments * (1 + preset.settings.branching),
  );
  f.advance(0.05);
  assert.ok(f.paths.every((p) => p.points.every(Number.isFinite)));
}
const max = new PlasmaField({ ...DEFAULTS, filaments: 80, branching: 4 });
assert.equal(max.paths.length, 400);
max.update({ ...DEFAULTS, filaments: 12, branching: 0 });
assert.equal(max.paths.length, 12);
assert.equal(options({ filaments: Infinity }).filaments, 36);
assert.equal(options({ speed: -5 }).speed, 0.1);
console.log(
  "Plasma model: deterministic evolution, branching connections, spherical endpoints, registered attraction/release, mode differences, idle sleep, presets and limits passed.",
);
