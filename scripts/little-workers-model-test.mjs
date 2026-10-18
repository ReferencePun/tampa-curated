import assert from "node:assert/strict";
import {
  ACTIVITIES,
  evaluate,
  trace,
  WALL_PATH,
  inkStrokes,
  options,
  joint,
} from "../src/creative-lab/experiments/little-workers/model.js";
const near = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
for (const activity of ACTIVITIES) {
  const forward = Array.from({ length: 1001 }, (_, i) =>
    evaluate(activity, i / 1000),
  );
  for (let i = 1000; i >= 0; i--)
    assert.deepEqual(
      evaluate(activity, i / 1000),
      forward[i],
      "Arbitrary reverse seeks reproduce the exact pose and output",
    );
  for (const state of forward)
    for (const coord of JSON.stringify(state).match(/-?\d+(?:\.\d+)?/g))
      assert.ok(Number.isFinite(+coord));
  for (const boundary of activity === "hammer"
    ? [0.2, 0.4, 0.6, 0.8]
    : activity === "rope"
      ? [0.25, 0.5, 0.75]
      : activity === "carry"
        ? [1 / 3, 2 / 3]
        : []) {
    const a = evaluate(activity, boundary - 1e-7),
      b = evaluate(activity, boundary + 1e-7);
    assert.ok(
      Math.hypot(a.pose.hip[0] - b.pose.hip[0], a.pose.hip[1] - b.pose.hip[1]) <
        0.01,
      `${activity}: cycle body continuity`,
    );
  }
}
for (let i = 0; i < 5; i++) {
  const s = evaluate("hammer", (i + 0.6) / 5);
  near(s.tool.head[0], s.nail[0]);
  near(s.tool.head[1], s.nail[1]);
  assert.equal(s.output.completed, i + 1);
  near(s.output.nails[i].depth, 1);
}
assert.equal(evaluate("hammer", 1).output.divider, 1);
for (let i = 0; i < 800; i++) {
  const s = evaluate("ladder", i / 800),
    fixed = s.planted;
  for (const point of [s.pose.hands[fixed], s.pose.feet[fixed]])
    near((309 - point[1]) / 22, Math.round((309 - point[1]) / 22));
}
for (let i = 0; i <= 500; i++) {
  const s = evaluate("rope", i / 500);
  near(s.output.pull + s.output.objectY, 245);
  near(s.output.ropeAngle * 22, s.output.lift);
  s.pose.hands.forEach((h) => near(h[0], 185));
}
for (let i = 0; i <= 500; i++) {
  const s = evaluate("paint", i / 500);
  assert.deepEqual(s.tool.head, s.output.tip);
  assert.deepEqual(s.output.tip, s.output.line.at(-1));
  near(s.output.length, (s.output.total * i) / 500);
  if (s.output.penDown)
    assert.deepEqual(s.output.tip, s.output.strokes.at(-1).at(-1));
}
for (let i = 0; i < 3; i++) {
  const s = evaluate("carry", (i + 0.86) / 3);
  near(s.tool.x, 342);
  near(s.tool.y, 288 - i * 32);
  near(s.pose.hands[0][0], s.tool.x + 46);
  near(s.pose.hands[1][0], s.tool.x + 102);
}
assert.equal(evaluate("carry", 1).output.completed, 3);
assert.equal(
  inkStrokes(WALL_PATH).length,
  5,
  "Pencil lifts between independent architectural contours",
);
assert.deepEqual(trace(WALL_PATH, 1).tip, WALL_PATH.at(-1));
assert.equal(options({ ink: "url(x)", size: 100 }).ink, "#37342e");
assert.equal(options({ size: 100 }).size, 1.25);
assert.throws(() => evaluate("unknown", 0));
assert.equal(joint([0, 0], [40, 0], 25, 25)[1], 15);
console.log(
  "Little workers: 5,005 reversible poses, cycle continuity, five exact hammer impacts, 800 planted ladder contacts, rope conservation, arc-length pencil contact, beam placement, and input validation passed.",
);
