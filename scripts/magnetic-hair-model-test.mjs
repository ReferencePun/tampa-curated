import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FilingsField,
  DEFAULTS,
  PRESETS,
  options,
  readArtwork,
} from "../src/creative-lab/experiments/magnetic-hair-toy/model.js";
import {
  scorePattern,
  patternSamples,
  createChallenge,
} from "../src/creative-lab/experiments/magnetic-hair-toy/challenges.js";
import { validateSettings } from "../src/creative-lab/shared/presets.js";
const manifest = JSON.parse(
  readFileSync(
    "src/creative-lab/experiments/magnetic-hair-toy/manifest.json",
    "utf8",
  ),
);
assert.deepEqual(validateSettings(manifest, DEFAULTS), DEFAULTS);
for (const p of Object.values(PRESETS))
  assert.deepEqual(validateSettings(manifest, p.settings), p.settings);
assert.doesNotThrow(() =>
  validateSettings(
    manifest,
    options({ strength: 3.245, radius: 73.3, clumping: 0.317, density: 6666 }),
  ),
);
const a = new FilingsField(),
  b = new FilingsField();
const clean = a.serialize();
assert.equal(a.statistics().placed, 0);
for (const f of [a, b]) {
  f.move(450, 675, false);
  f.engage();
  assert.ok(f.statistics().held > 250);
  assert.ok(f.statistics().held <= f.capacity());
  for (let i = 0; i < 10; i++) {
    f.move(450 + i * 5, 675 - i * 30);
    for (let j = 0; j < 6; j++) f.step(1 / 120);
  }
  for (let i = 0; i < 100; i++) f.step(1 / 120);
  f.release();
}
assert.deepEqual(a.x, b.x);
assert.deepEqual(a.y, b.y);
assert.deepEqual(a.angle, b.angle);
assert.ok(a.statistics().placed > 200);
const retained = a.statistics().checksum;
for (let i = 0; i < 300; i++) a.step();
assert.equal(
  a.statistics().checksum,
  retained,
  "Dropped grains stay exactly in place",
);
assert.equal(a.count, 3800);
const restored = new FilingsField();
restored.load(a.serialize());
assert.ok(
  Math.abs(a.statistics().checksum - restored.statistics().checksum) < 1,
);
const bad = {
  ...clean,
  particles: [[NaN, 20, 0], ...clean.particles.slice(1)],
};
assert.throws(() => restored.load(bad));
assert.throws(() => readArtwork({ ...clean, version: 2 }));
assert.throws(() => a.move(NaN, 20));
a.update({ density: 7000 });
assert.equal(a.count, 7000);
assert.equal(a.statistics().placed, b.statistics().placed);
a.update({ density: 1200 });
assert.ok(a.statistics().placed > 50);
a.reset();
const empty = a.serialize();
a.move(450, 675, false);
a.engage();
a.move(500, 300);
a.step(0.02, true);
a.beginShake();
a.shake(0.5);
assert.notDeepEqual(a.serialize().particles, empty.particles);
a.shake(1);
assert.deepEqual(a.serialize().particles, empty.particles);
const fast = new FilingsField({ strength: 2.5 }),
  slow = new FilingsField({ strength: 0.3 });
for (const f of [fast, slow]) {
  f.move(450, 675, false);
  f.engage();
  f.move(450, 380);
  for (let i = 0; i < 20; i++) f.step(1 / 120);
}
const distance = (f) => {
  let sum = 0;
  for (let i = 0; i < f.count; i++)
    if (f.held[i]) sum += Math.hypot(f.x[i] - 450, f.y[i] - 380);
  return sum;
};
assert.ok(distance(fast) < distance(slow), "Strength changes attraction");
const loose = new FilingsField({ clumping: 0 }),
  clumped = new FilingsField({ clumping: 1 });
for (const f of [loose, clumped]) {
  f.move(450, 675, false);
  f.engage();
  f.move(450, 380);
  f.step(1 / 60, true);
}
assert.notDeepEqual(loose.x, clumped.x);
const swept = new FilingsField({ radius: 25 });
swept.move(450, 100, false);
swept.engage();
swept.move(450, 735);
assert.ok(
  swept.statistics().held > 0,
  "Swept pickup finds grains between distant pointer samples",
);
assert.equal(swept.count, 3800);
const near = new FilingsField({ radius: 25 }),
  wide = new FilingsField({ radius: 110 });
for (const f of [near, wide]) {
  f.move(450, 675, false);
  f.engage();
}
assert.ok(wide.statistics().held > near.statistics().held);
for (const kind of [
  "handlebar",
  "brows",
  "beard",
  "crown",
  "antennae",
  "spiral",
]) {
  const f = new FilingsField(),
    pts = patternSamples(kind, "milo");
  assert.equal(scorePattern(f, kind, "milo").score, 0);
  pts.forEach((p, j) => {
    for (let k = 0; k < 7; k++) {
      const i = j * 7 + k;
      f.x[i] = p[0] + (k % 3) - 1;
      f.y[i] = p[1] + Math.floor(k / 3) - 1;
    }
  });
  assert.ok(
    scorePattern(f, kind, "milo").score > 85,
    kind + " recognizes a well-filled template",
  );
  for (let i = 1000; i < 2000; i++) {
    f.x[i] = 220;
    f.y[i] = 110;
  }
  assert.ok(
    scorePattern(f, kind, "milo").score < 65,
    "Stray marks reduce precision",
  );
  f.dispose();
}
const timer = createChallenge();
timer.start(20);
for (let i = 0; i < 20; i++) timer.tick(0.25, 70);
assert.equal(timer.state().remaining, 15);
const pause = timer.state();
assert.deepEqual(timer.state(), pause);
for (let i = 0; i < 60; i++) timer.tick(0.25, 80);
assert.equal(timer.state().status, "finished");
assert.equal(timer.state().result, 80);
timer.reset();
assert.equal(timer.state().status, "ready");
timer.start(45);
timer.finish(63);
assert.equal(timer.state().result, 63);
for (const f of [
  a,
  b,
  restored,
  fast,
  slow,
  loose,
  clumped,
  swept,
  near,
  wide,
]) {
  assert.ok(f.x.every((v) => Number.isFinite(v) && v >= 22 && v <= 878));
  f.dispose();
  assert.equal(f.count, 0);
}
console.log(
  "Magnetic filings: deterministic pickup/transport, grain capacity, release retention, strength/radius/clumping, bounded shake, artwork roundtrip, scoring and challenge clock passed.",
);
