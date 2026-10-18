import assert from "node:assert/strict";
import {
  DEFAULTS,
  PRESETS,
  options,
  createDrawing,
  pathDocument,
  readDrawing,
  replayPosition,
  angleDelta,
  boardHeight,
  LIMIT,
} from "../src/creative-lab/experiments/drawing-toys/model.js";
import {
  examplePath,
  EXAMPLES,
} from "../src/creative-lab/experiments/drawing-toys/examples.js";
import { erasePose } from "../src/creative-lab/experiments/drawing-toys/erase.js";
const dial = createDrawing("dial");
const start = dial.state().cursor;
dial.begin();
dial.move(0.2, 0);
dial.move(0, -0.2);
dial.commit();
let s = dial.state();
assert.equal(s.events.length, 2);
assert.deepEqual(s.events[0].a, start);
assert.deepEqual(s.events[0].b, s.events[1].a);
assert.equal(s.undo, 1);
dial.begin();
dial.stroke([0.99, 0.99], [0.5, 0.5]);
dial.commit();
assert.deepEqual(
  dial.state().events[2].a,
  s.cursor,
  "Dial cannot lift or teleport to supplied stroke start",
);
dial.begin();
dial.move(99, -99);
dial.commit();
assert.deepEqual(dial.state().cursor, [1, 0]);
assert.equal(dial.move(1, -1), false);
assert.equal(dial.stamp("star", [0.5, 0.5]), false);
assert.equal(dial.wipe(0, 1), false);
const complete = dial.serialize();
dial.clear();
assert.equal(dial.state().events.length, 0);
dial.undo();
assert.deepEqual(dial.serialize(), complete);
dial.redo();
assert.equal(dial.state().events.length, 0);
dial.undo();
dial.begin();
dial.move(-0.1, 0.1);
dial.cancel();
assert.deepEqual(dial.serialize(), complete);
assert.ok(
  Math.abs(angleDelta(Math.PI - 0.02, -Math.PI + 0.02) - 0.04) < 1e-10,
  "No jump crossing angular wrap",
);
for (const [id] of EXAMPLES) {
  const doc = pathDocument(examplePath(id));
  assert.deepEqual(readDrawing(doc), doc);
  dial.load(doc);
  const before = JSON.stringify(dial.serialize());
  for (const progress of [0, 0.2, 0.5, 0.9, 1, 0.9, 0.5, 0.2, 0]) {
    const p = replayPosition(dial.state(), progress);
    assert.ok(p.index >= 0 && p.index <= doc.events.length);
    assert.ok(p.fraction >= 0 && p.fraction <= 1);
  }
  assert.equal(JSON.stringify(dial.serialize()), before);
  assert.equal(replayPosition(dial.state(), 1).index, doc.events.length);
}
assert.throws(() =>
  pathDocument({
    points: [
      [0, 0],
      [NaN, 1],
    ],
  }),
);
assert.throws(() =>
  pathDocument({
    points: [
      [0, 0],
      [1.1, 1],
    ],
  }),
);
assert.throws(() =>
  readDrawing({
    ...complete,
    events: [{ ...complete.events[0], tool: "eraser" }],
  }),
);
assert.throws(() => readDrawing({ ...complete, cursor: [0, 0] }));
const gap = structuredClone(complete);
gap.events[1].a = [0.7, 0.8];
assert.throws(() => readDrawing(gap));
const magnetic = createDrawing("magnetic");
magnetic.begin();
magnetic.stroke([0.1, 0.1], [0.2, 0.2]);
magnetic.stroke([0.8, 0.8], [0.9, 0.9]);
magnetic.commit();
magnetic.begin();
magnetic.stamp("star", [0.5, 0.5]);
magnetic.wipe(0.2, 0.7);
magnetic.commit();
assert.equal(magnetic.state().undo, 2);
const doc = magnetic.serialize();
assert.deepEqual(readDrawing(doc), doc);
magnetic.undo();
assert.equal(magnetic.state().events.length, 2);
magnetic.redo();
assert.deepEqual(magnetic.serialize(), doc);
const fresh = createDrawing("dial");
for (let i = 0; i < LIMIT + 4; i++) fresh.move(i % 2 ? 0.001 : -0.001, 0);
assert.equal(fresh.state().events.length, LIMIT);
assert.equal(options({ sensitivity: 999 }).sensitivity, 2.5);
assert.equal(boardHeight("wide"), 550);
for (const p of Object.values(PRESETS))
  assert.deepEqual(options(p.settings), p.settings);
assert.deepEqual(options(), DEFAULTS);
assert.equal(erasePose("dial", 1).opacity, 0);
assert.equal(erasePose("dial", 0.4, true).x, 0);
assert.equal(erasePose("magnetic", 0.4).wipe, 0.4);
dial.dispose();
magnetic.dispose();
fresh.dispose();
assert.equal(dial.state().events.length, 0);
console.log(
  "Drawing toys: unbroken head/axis constraints, angular wrap, bounded marks, semantic magnetic edits, undo/redo, validated path imports and deterministic replay passed.",
);
