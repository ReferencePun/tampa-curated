import assert from "node:assert/strict";
import {
  PrecisionGame,
  DEFAULTS,
  PRESETS,
  options,
  sweptSafe,
  validateScene,
} from "../src/creative-lab/experiments/operation-game/model.js";
import { createBoard } from "../src/creative-lab/experiments/operation-game/board.js";
function game(config = {}) {
  const c = options({ ...DEFAULTS, ...config });
  return new PrecisionGame(createBoard(c), c);
}
function extract(g, i) {
  const c = g.scene.cavities[i];
  assert.equal(g.begin(c.start), true);
  for (const p of c.path.slice(1)) assert.equal(g.move(p), true);
  assert.equal(g.end(), true);
}
for (const p of Object.values(PRESETS)) {
  const g = game(p.settings);
  g.start();
  for (let i = 0; i < g.pieces.length; i++) extract(g, i);
  assert.equal(g.status, "complete");
  assert.equal(g.score, g.pieces.length * 100);
  assert.equal(g.faults, 0);
  assert.equal(g.begin(g.scene.cavities[0].start), false);
}
// Even the tightest available setup has a genuinely traversable centerline.
const max = game({
  difficulty: "expert",
  mode: "precision",
  objectSize: 1.25,
  tolerance: 5,
});
for (let i = 0; i < max.pieces.length; i++) extract(max, i);
const g = game(),
  c = g.scene.cavities[0];
g.begin(c.start);
g.move({ x: c.start.x, y: c.start.y + 200 });
assert.equal(g.faults, 1);
assert.equal(g.active, null);
assert.equal(g.pieces[0].x, c.start.x);
g.end();
assert.equal(g.faults, 1);
assert.equal(g.score, 0);
extract(g, 0);
assert.equal(g.score, 100);
g.begin(g.scene.cavities[1].start);
g.move({ x: 20, y: 20 });
assert.equal(g.score, 75);
assert.equal(g.successes, 1);
// Endpoints inside a concave cavity still collide across its missing corner.
const polygon = [
  { x: 0, y: 0 },
  { x: 80, y: 0 },
  { x: 80, y: 20 },
  { x: 20, y: 20 },
  { x: 20, y: 80 },
  { x: 0, y: 80 },
];
assert.equal(sweptSafe(polygon, { x: 65, y: 10 }, { x: 10, y: 65 }, 3), false);
assert.equal(sweptSafe(polygon, { x: 65, y: 10 }, { x: 10, y: 10 }, 3), true);
assert.equal(sweptSafe(polygon, { x: 5, y: 10 }, { x: 5, y: 10 }, 5), true);
assert.equal(
  sweptSafe(polygon, { x: 5, y: 10 }, { x: 5, y: 10 }, 5.001),
  false,
);
const precision = game({ mode: "precision" });
for (let i = 0; i < 3; i++) {
  precision.begin(precision.scene.cavities[0].start);
  precision.move({ x: 0, y: 0 });
}
assert.equal(precision.status, "failed");
assert.equal(precision.begin(precision.scene.cavities[0].start), false);
const timed = game({ mode: "timed", timer: 30 });
timed.advance(10);
assert.equal(timed.remaining, 30);
assert.equal(timed.begin(timed.scene.cavities[0].start), false);
timed.start();
timed.advance(29);
timed.begin(timed.scene.cavities[0].start);
timed.advance(1);
assert.equal(timed.status, "finished");
assert.equal(timed.active, null);
assert.equal(timed.faults, 0);
timed.reset();
assert.equal(timed.remaining, 30);
assert.equal(timed.status, "ready");
const cancel = game();
cancel.begin(cancel.scene.cavities[0].start);
cancel.move(cancel.scene.cavities[0].path[1]);
cancel.end(true);
assert.equal(cancel.faults, 0);
assert.equal(cancel.successes, 0);
assert.deepEqual(
  { x: cancel.pieces[0].x, y: cancel.pieces[0].y },
  cancel.scene.cavities[0].start,
);
const small = game({ objectSize: 0.7, tolerance: 0 }),
  large = game({ objectSize: 1.25, tolerance: 5 });
assert.ok(large.radius(c) > small.radius(c));
const silly = options({ mode: "silly" });
assert.deepEqual(createBoard(silly, 9), createBoard(silly, 9));
assert.notDeepEqual(
  createBoard(silly, 9).cavities.map((c) => c.name),
  createBoard(silly, 10).cavities.map((c) => c.name),
);
const custom = {
  width: 900,
  height: 720,
  cavities: [
    {
      id: "custom",
      polygon,
      start: { x: 65, y: 10 },
      exit: { x: 10, y: 65 },
      radius: 3,
      exitRadius: 4,
    },
  ],
  rules: { points: 40, penalty: 7, strikes: 2 },
};
const portable = new PrecisionGame(custom, { ...DEFAULTS, tolerance: 0 });
portable.begin(custom.cavities[0].start);
portable.move({ x: 10, y: 10 });
portable.move(custom.cavities[0].exit);
assert.equal(portable.end(), true);
assert.equal(portable.score, 40);
assert.throws(() =>
  validateScene({
    ...custom,
    cavities: [{ ...custom.cavities[0], exit: { x: 90, y: 90 } }],
  }),
);
assert.throws(() =>
  validateScene({
    ...custom,
    cavities: [...custom.cavities, ...custom.cavities],
  }),
);
console.log(
  "Precision engine: all presets, maximum difficulty, continuous collision, concave shortcuts, exact clearance, cancellation, scoring, three strikes, timed expiry, seeded shuffle and custom boards passed.",
);
