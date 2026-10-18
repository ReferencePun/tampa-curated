import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  WaterToy,
  DEFAULTS,
  PRESETS,
  validateScene,
  STEP,
} from "../src/creative-lab/experiments/waterfall-ring-toss/model.js";
import { validateSettings } from "../src/creative-lab/shared/presets.js";
const manifest = JSON.parse(
  await readFile(
    "src/creative-lab/experiments/waterfall-ring-toss/manifest.json",
  ),
);
assert.deepEqual(
  DEFAULTS,
  JSON.parse(
    await readFile(
      "src/creative-lab/experiments/waterfall-ring-toss/config.json",
    ),
  ),
);
for (const p of Object.values(PRESETS)) validateSettings(manifest, p.settings);
const simulate = (m, seconds, dt = STEP) => {
  for (let i = 0; i < Math.round(seconds / dt); i++) m.advance(dt);
  return m;
};
// Real jet forces must alter underlying ring state, including left/right locality.
const a = new WaterToy(),
  b = new WaterToy(),
  strong = new WaterToy({ strength: 1.8 });
a.pump(0);
b.pump(1);
strong.pump(0);
assert.ok(a.rings[1].vy < b.rings[1].vy);
assert.ok(a.rings[8].vy > b.rings[8].vy);
assert.ok(strong.rings[1].vy < a.rings[1].vy);
assert.equal(a.pump(0), false);
simulate(a, 0.2);
assert.equal(a.pump(0), true);
// Deterministic 30/60/120 Hz partitioning for the same timed inputs.
const states = [];
for (const dt of [1 / 30, 1 / 60, STEP]) {
  const m = new WaterToy();
  m.pump(0);
  simulate(m, 4, dt);
  m.pump(1);
  simulate(m, 5, dt);
  states.push(m);
}
for (const m of states.slice(1))
  for (let i = 0; i < m.rings.length; i++) {
    assert.ok(Math.abs(m.rings[i].x - states[0].rings[i].x) < 1e-7);
    assert.ok(Math.abs(m.rings[i].y - states[0].rings[i].y) < 1e-7);
  }
// Catch only on downward crossing with an aligned ring opening.
const scene = {
  pegs: [{ id: "test", x: 400, tip: 200, base: 340 }],
  objects: [{ x: 400, y: 199, color: "#ee7744" }],
};
const catchToy = new WaterToy({ turbulence: 0 }, scene);
catchToy.rings[0].vy = 60;
catchToy.advance(0.05);
assert.equal(catchToy.score(), 1);
assert.equal(catchToy.rings[0].peg, "test");
simulate(catchToy, 3);
assert.ok(Math.abs(catchToy.rings[0].y - 331) < 0.01);
assert.equal(
  catchToy.drainEvents().filter((e) => e.type === "catch").length,
  1,
);
catchToy.pump(0);
simulate(catchToy, 2);
assert.equal(catchToy.score(), 1, "Caught rings stay secured");
for (const [x, y, vy] of [
  [424, 199, 60],
  [400, 201, -60],
  [400, 240, 20],
]) {
  const m = new WaterToy({ turbulence: 0 }, { ...scene, objects: [{ x, y }] });
  m.rings[0].vy = vy;
  m.advance(0.05);
  assert.equal(
    m.score(),
    0,
    "Near miss, upward crossing, and starting below a tip are not catches",
  );
}
// Full classic game is winnable using actual pump impulses, without editing ring state.
const win = new WaterToy();
for (let i = 0; i < 120 * 180 && !win.state().complete; i++) {
  if (i % 480 === 0) win.pump(Math.floor(i / 480) % 2);
  win.advance(STEP);
}
assert.equal(win.state().caught, 10);
assert.ok(win.time < 180);
assert.equal(
  win.pegs.reduce((sum, p) => sum + p.count, 0),
  10,
);
console.log(
  `Classic: all 10 caught in ${win.time.toFixed(1)} simulated seconds / ${win.pumpCount} pumps.`,
);
const endless = new WaterToy({ mode: "endless" });
for (let i = 0; i < 120 * 180 && endless.round === 1; i++) {
  if (i % 480 === 0) endless.pump(Math.floor(i / 480) % 2);
  endless.advance(STEP);
}
assert.equal(endless.round, 2);
assert.equal(endless.state().caught, 0);
assert.equal(endless.total, 10);
const timed = new WaterToy({ mode: "challenge", timer: 20 });
assert.equal(timed.pump(0), false);
simulate(timed, 2);
assert.equal(timed.remaining, 20);
timed.start();
timed.pump(0);
simulate(timed, 21);
assert.equal(timed.challenge, "finished");
assert.equal(timed.remaining, 0);
assert.equal(timed.pump(1), false);
timed.reset();
assert.equal(timed.challenge, "ready");
assert.equal(timed.pumpCount, 0);
// Different gravity and turbulence change trajectories; scene changes reset, visual changes preserve.
const light = new WaterToy({ buoyancy: 0.4, turbulence: 0 }),
  heavy = new WaterToy({ buoyancy: 1.6, turbulence: 0 });
light.pump(0);
heavy.pump(0);
simulate(light, 1);
simulate(heavy, 1);
assert.ok(light.rings[1].y < heavy.rings[1].y);
const positions = light.rings.map((r) => [r.x, r.y]);
light.update({ world: "moon" });
assert.deepEqual(
  light.rings.map((r) => [r.x, r.y]),
  positions,
);
light.update({ layout: "arch" });
assert.equal(light.pegs.length, 4);
assert.equal(light.pumpCount, 0);
for (const shape of ["rounded", "porthole"]) {
  const m = new WaterToy({
    ringCount: 24,
    strength: 1.8,
    turbulence: 1,
    shape,
  });
  for (let i = 0; i < 7200; i++) {
    if (i % 24 === 0) m.pump(Math.floor(i / 24) % 2);
    m.advance(STEP);
  }
  assert.ok(m.bubbles.length <= 160);
  for (const r of m.rings) {
    assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y));
    assert.ok(r.x > 20 && r.x < 780 && r.y >= 30 && r.y < 490);
  }
  assert.equal(m.rings.length, 24);
}
assert.throws(() => validateScene({ pegs: [{ x: 400, tip: 350, base: 300 }] }));
assert.throws(() => validateScene({ pumps: [{ x: NaN, y: 300 }] }));
assert.throws(() =>
  validateScene({ objects: Array(25).fill({ x: 400, y: 300 }) }),
);
assert.throws(() => new WaterToy().advance(-1));
const custom = new WaterToy(
  { turbulence: 0 },
  { ...scene, scoring: { points: 5 } },
);
custom.rings[0].vy = 60;
custom.advance(0.05);
assert.equal(custom.score(), 5);
console.log(
  "Water toy model: genuine captures and misses, stack settling, deterministic time, winnability, endless replenishment, timer, parameters, scene validation and bounded load passed.",
);
// Every scenery/game preset must remain playable with real input, not only the classic board.
for (const [key, preset] of Object.entries(PRESETS)) {
  const m = new WaterToy(preset.settings);
  if (m.config.mode === "challenge") m.start();
  for (let f = 0; f < 120 * 90; f++) {
    if (f % 480 === 0) m.pump(Math.floor(f / 480) % 2);
    m.advance(STEP);
  }
  assert.ok(m.state().caught > 0, `${key} must permit actual peg catches`);
}
const customJets = new WaterToy(
  { layout: "arch" },
  { pumps: [{ x: 350, y: 450, spread: 200 }] },
);
customJets.update({ layout: "quartet" });
assert.equal(
  customJets.scene.pumps[0].x,
  350,
  "Explicit source geometry never moves when demo settings change",
);
assert.throws(() =>
  validateScene({ objects: [{ x: 400, y: 300, radius: NaN }] }),
);
assert.throws(() =>
  validateScene({
    pegs: [
      { id: "same", x: 250, tip: 200, base: 300 },
      { id: "same", x: 550, tip: 200, base: 300 },
    ],
  }),
);
console.log(
  "All five preset setups produce actual catches; custom jet positions and invalid geometry checks passed.",
);
