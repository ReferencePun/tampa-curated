import assert from "node:assert/strict";
import {
  ANSWER_SETS,
  DEFAULTS,
  PRESETS,
  AnswerEngine,
  validateSets,
} from "../src/creative-lab/experiments/magic-8-ball/answers.js";
import {
  OrbMotion,
  poseAt,
  ShakeGesture,
  options,
} from "../src/creative-lab/experiments/magic-8-ball/motion.js";
assert.deepEqual(options(), DEFAULTS);
for (const p of Object.values(PRESETS))
  assert.deepEqual(options(p.settings), p.settings);
for (const seed of [1, 32, 805, 9999])
  for (const mode of Object.keys(ANSWER_SETS)) {
    const e = new AnswerEngine(seed),
      other = new AnswerEngine(seed),
      n = ANSWER_SETS[mode].answers.length;
    let prev = "";
    for (let cycle = 0; cycle < 12; cycle++) {
      const bag = [];
      for (let j = 0; j < n; j++) {
        const a = e.next(mode);
        assert.deepEqual(a, other.next(mode));
        assert.notEqual(a.id, prev);
        assert.ok(ANSWER_SETS[mode].answers.some((v) => v[1] === a.text));
        prev = a.id;
        bag.push(a.id);
      }
      assert.equal(new Set(bag).size, n);
    }
    const state = e.snapshot(),
      restored = new AnswerEngine(9);
    restored.restore(JSON.parse(JSON.stringify(state)));
    assert.deepEqual(restored.next(mode), e.next(mode));
  }
for (let n = 2; n <= 20; n++) {
  const set = {
      custom: {
        name: "Custom",
        answers: Array.from({ length: n }, (_, i) => [
          "prompt",
          `Original answer ${i}`,
        ]),
      },
    },
    e = new AnswerEngine(32, set);
  let prev = "";
  for (let i = 0; i < n * 20; i++) {
    const a = e.next("custom");
    assert.notEqual(a.id, prev, `No repeat with ${n} custom answers`);
    prev = a.id;
  }
}
const a = new AnswerEngine(32),
  b = new AnswerEngine(33);
assert.notDeepEqual(
  Array.from({ length: 12 }, () => a.next("poetic").id),
  Array.from({ length: 12 }, () => b.next("poetic").id),
);
assert.throws(() =>
  validateSets({ x: { name: "Bad", answers: [["yes", "only one"]] } }),
);
assert.throws(() =>
  new AnswerEngine().restore({ seed: 2, draws: { poetic: Infinity } }),
);
assert.throws(() => new AnswerEngine().next("unknown"));
assert.equal(poseAt(0).phase, "shaking");
assert.equal(poseAt(1.2).phase, "submerged");
assert.equal(poseAt(2.5).phase, "rising");
assert.equal(poseAt(4).phase, "settling");
assert.equal(poseAt(4.8).phase, "answered");
assert.equal(poseAt(0).visibility, 0);
assert.equal(poseAt(4.8).visibility, 1);
assert.ok(poseAt(0.2, 2).energy > poseAt(0.2, 0.4).energy);
for (let t = 0; t < 4.8; t += 0.01) {
  const p = poseAt(t);
  for (const v of Object.values(p))
    if (typeof v === "number") assert.ok(Number.isFinite(v));
  assert.ok(p.visibility >= 0 && p.visibility <= 1);
  assert.deepEqual(p, poseAt(t));
}
for (const speed of [0.5, 1, 2]) {
  const m = new OrbMotion();
  m.shake(1);
  let completions = 0;
  for (let i = 0; i < 1100; i++) if (m.advance(0.01, speed)) completions++;
  assert.equal(completions, 1);
  assert.equal(m.pose().phase, "answered");
  assert.ok(!m.busy);
  m.shake();
  assert.ok(m.busy);
  m.advance(0.01, 1, true);
  assert.equal(m.pose().phase, "answered");
  m.reset();
  assert.equal(m.pose().phase, "ready");
}
const quick = new ShakeGesture(0, 0, 0);
quick.add(100, 0, 30);
quick.add(-100, 0, 60);
quick.add(100, 0, 90);
const gentle = new ShakeGesture(0, 0, 0);
gentle.add(12, 0, 300);
assert.ok(quick.strength > gentle.strength);
assert.ok(quick.strength <= 1.8);
assert.equal(quick.reversals, 2);
assert.equal(gentle.dragged, false);
assert.deepEqual(options({ seed: 0, intensity: 20, autoShake: "yes" }), {
  ...DEFAULTS,
  seed: 1,
  intensity: 2,
});
console.log(
  "Murmur: four original answer sets, deterministic complete shuffle cycles, 2–20 answer custom sets, no adjacent repeats, sequence restore, reveal envelopes, gesture energy and presets passed.",
);
