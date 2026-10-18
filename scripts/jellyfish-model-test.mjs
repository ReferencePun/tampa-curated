import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  JellyfishScene,
  DEFAULTS,
  PRESETS,
  options,
  pulse,
  bellShape,
  attachment,
} from "../src/creative-lab/experiments/jellyfish-tank/model.js";
const advance = (f, s) => {
  for (let i = 0; i < Math.round(s * 120); i++) f.advance(1 / 120);
};
assert.equal(pulse(0).amount, 0);
assert.ok(Math.abs(pulse(0.28).amount - 1) < 1e-8);
assert.ok(pulse(0.12).derivative > 0);
assert.ok(pulse(0.6).derivative < 0);
assert.ok(Math.abs(pulse(1).amount) < 1e-8);
for (const boundary of [0, 0.28, 1]) {
  const epsilon = 1e-5;
  assert.ok(
    Math.abs(
      pulse(boundary + epsilon).derivative - pulse(boundary).derivative,
    ) /
      epsilon <
      0.1,
    "Pulse acceleration must settle smoothly at the end of contraction/recovery",
  );
  assert.ok(
    Math.abs(
      pulse(boundary).derivative - pulse(boundary - epsilon).derivative,
    ) /
      epsilon <
      0.1,
  );
}
let impulse = 0;
for (let i = 0; i < 1200; i++)
  impulse += Math.max(0, pulse(i / 1200).derivative) / 1200;
assert.ok(Math.abs(impulse - 1) < 0.001);
const config = { ...DEFAULTS, count: 3, quality: "economy" },
  a = new JellyfishScene(config),
  b = new JellyfishScene(config);
for (let i = 0; i < 120; i++) a.advance(1 / 60);
for (let i = 0; i < 240; i++) b.advance(1 / 120);
assert.equal(a.time, b.time);
assert.deepEqual(
  a.jellies.map((j) => [j.x, j.y, j.phase, ...j.chains[0].points]),
  b.jellies.map((j) => [j.x, j.y, j.phase, ...j.chains[0].points]),
);
const j = a.jellies[0];
j.contraction = 0;
const expanded = bellShape(j);
j.contraction = 1;
const squeezed = bellShape(j);
assert.ok(squeezed.width < expanded.width && squeezed.height > expanded.height);
j.phase = 0.12;
j.vy = 0;
a.step(1 / 120);
assert.ok(j.thrust > 0 && j.vy < 0, "Bell contraction must propel upward");
j.phase = 0.6;
a.step(1 / 120);
assert.equal(j.thrust, 0, "Recovery does not create thrust");
const small = a.jellies[0],
  large = a.jellies[1];
small.species = large.species = "moon";
small.scale = 0.5;
large.scale = 1.5;
small.phase = large.phase = 0.1;
a.step(1 / 120);
assert.ok(small.phase > large.phase, "Larger bells pulse more slowly");
assert.ok(small.thrust > large.thrust);
const chain = j.chains[0],
  tip = chain.points.at(-2),
  root = chain.points[0];
j.x += 0.07;
a.step(1 / 120);
assert.ok(
  Math.abs(chain.points.at(-2) - tip) < Math.abs(chain.points[0] - root) * 0.4,
  "Tip must lag a displaced root",
);
advance(a, 30);
let strain = 0;
for (const j of a.jellies) {
  assert.ok([j.x, j.y, j.vx, j.vy, j.phase].every(Number.isFinite));
  assert.ok(j.y > -0.12 && j.y < 1.08);
  for (const chain of j.chains) {
    const q = attachment(j, chain);
    assert.ok(
      Math.abs(chain.points[0] - q.x) < 1e-6 &&
        Math.abs(chain.points[1] - q.y) < 1e-6,
    );
    for (let k = 2; k < chain.points.length; k += 2)
      strain = Math.max(
        strain,
        Math.hypot(
          chain.points[k] - chain.points[k - 2],
          chain.points[k + 1] - chain.points[k - 1],
        ) / chain.rest,
      );
    assert.ok(chain.points.every(Number.isFinite));
  }
}
assert.ok(strain < 1.3, "Filament constraints remain bounded: " + strain);
const smooth = new JellyfishScene(config);
advance(smooth, 2);
let smoothTime = smooth.renderState().time,
  smoothAngle = smooth.renderState().jellies[0].angle;
for (let frame = 0; frame < 40; frame++) {
  smooth.advance(1 / 240);
  const view = smooth.renderState();
  assert.ok(
    Math.abs(view.time - smoothTime - 1 / 240) < 1e-9,
    "The display clock must advance smoothly between fixed simulation steps",
  );
  assert.notEqual(
    view.jellies[0].angle,
    smoothAngle,
    "High-refresh displays must not repeat alternate poses",
  );
  smoothTime = view.time;
  smoothAngle = view.jellies[0].angle;
}
const frozenView = JSON.stringify(smooth.renderState());
assert.equal(
  JSON.stringify(smooth.renderState()),
  frozenView,
  "A paused draw cannot alter its pose",
);
smooth.resize(0.7);
assert.ok(smooth.renderState().jellies.every((j) => Number.isFinite(j.x)));
smooth.dispose();
assert.equal(smooth.renderState().jellies.length, 0);
const base = new JellyfishScene({ ...DEFAULTS, quality: "economy" }),
  live = new JellyfishScene({ ...DEFAULTS, quality: "economy", mode: "light" }),
  near = live.jellies[0];
live.point((near.x + 0.025) / live.aspect, near.y);
advance(base, 1);
advance(live, 1);
assert.ok(live.jellies.some((j) => j.response > 0.1));
assert.ok(
  live.jellies.some((j) => j.response === 0),
  "Light response stays local",
);
assert.notDeepEqual(
  live.jellies.map((j) => j.x),
  base.jellies.map((j) => j.x),
);
// Directional strokes must visibly carry nearby bells and their stateful tissue.
const stirred = new JellyfishScene({ ...DEFAULTS, mode: "disturb" }),
  untouched = new JellyfishScene({ ...DEFAULTS, mode: "disturb" }),
  target = stirred.jellies.find((j) => j.id === 0),
  ox = target.x,
  oy = target.y;
stirred.point((ox - 0.1) / stirred.aspect, oy + 0.03, true);
for (let frame = 0; frame < 45; frame++) {
  stirred.point(
    (ox - 0.1 + (frame / 44) * 0.27) / stirred.aspect,
    oy + 0.03,
    true,
  );
  stirred.advance(1 / 60);
  untouched.advance(1 / 60);
}
assert.ok(stirred.currents.length > 0 && stirred.currents.length <= 20);
assert.ok(
  target.x - untouched.jellies.find((j) => j.id === 0).x > 0.006,
  "A rightward stroke must carry a nearby bell visibly to the right",
);
assert.notDeepEqual(
  [...target.chains[0].points],
  [...untouched.jellies.find((j) => j.id === 0).chains[0].points],
);
stirred.release();
advance(stirred, 3);
assert.equal(stirred.currents.length, 0, "Released currents expire");
const tapped = new JellyfishScene({ ...DEFAULTS, mode: "light" }),
  resting = new JellyfishScene({ ...DEFAULTS, mode: "light" }),
  tappedBell = tapped.jellies.find((j) => j.id === 0);
assert.equal(
  tapped.tap(tappedBell.x / tapped.aspect, tappedBell.y),
  tappedBell.id,
);
advance(tapped, 0.3);
advance(resting, 0.3);
assert.ok(
  tappedBell.contraction > resting.jellies.find((j) => j.id === 0).contraction,
  "Tapping a bell must actually contract its body",
);
assert.ok(
  tappedBell.thrust > resting.jellies.find((j) => j.id === 0).thrust,
  "The extra contraction must create swimming thrust",
);
assert.equal(
  tapped.tap(0.01, 0.01),
  -1,
  "Empty-water taps do not select a distant bell",
);
const ambient = new JellyfishScene({ ...DEFAULTS, mode: "ambient" });
assert.equal(ambient.tap(0.3, 0.3), -1);
ambient.point(0.2, 0.2, true);
ambient.point(0.5, 0.5, true);
assert.equal(ambient.currents.length, 0);
const wake = new JellyfishScene({
  ...DEFAULTS,
  mode: "disturb",
  quality: "economy",
});
for (let i = 0; i < 30; i++) wake.disturb(0.5, 0.5);
assert.equal(wake.wakes.length, 12);
advance(wake, 1);
assert.ok(wake.jellies.some((j) => j.response > 0));
advance(wake, 4);
assert.equal(wake.wakes.length, 0);
const quiet = new JellyfishScene({ ...config, mode: "light", interaction: 0 }),
  plain = new JellyfishScene(config);
quiet.point(0.5, 0.5, true);
advance(quiet, 1);
advance(plain, 1);
assert.deepEqual(
  quiet.jellies.map((j) => [j.x, j.y, j.phase]),
  plain.jellies.map((j) => [j.x, j.y, j.phase]),
);
quiet.update({ ...quiet.config, zoom: 1.5 });
quiet.point(0.8, 0.2);
const wp = quiet.worldPoint();
assert.ok(
  Math.abs(wp.x - quiet.aspect * 0.7) < 1e-10 && Math.abs(wp.y - 0.3) < 1e-10,
);
const before = quiet.time;
quiet.settleInput();
assert.equal(quiet.time, before);
quiet.release();
assert.equal(quiet.pointer.amount, 0);
for (const preset of Object.values(PRESETS)) {
  assert.deepEqual(options(preset.settings), preset.settings);
  quiet.update(preset.settings);
  assert.equal(quiet.jellies.length, preset.settings.count);
}
quiet.update({ ...DEFAULTS, quality: "fine" });
const fine = quiet.snapshot().filaments;
assert.equal(quiet.jellies[0].chains[0].points.length, 64);
quiet.update({ ...DEFAULTS, quality: "economy" });
assert.ok(quiet.snapshot().filaments < fine);
assert.equal(quiet.jellies[0].chains[0].points.length, 28);
quiet.resize(0.5);
assert.equal(quiet.aspect, 0.5);
assert.ok(quiet.jellies.every((j) => j.x < 0.55));
assert.equal(options({ minSize: 1.4, maxSize: 0.4 }).maxSize, 1.4);
assert.equal(options({ count: 999 }).count, 16);
assert.equal(options({ lightColor: "url(x)" }).lightColor, DEFAULTS.lightColor);
assert.deepEqual(
  JSON.parse(
    await readFile("src/creative-lab/experiments/jellyfish-tank/config.json"),
  ),
  DEFAULTS,
);
const manifest = JSON.parse(
  await readFile("src/creative-lab/experiments/jellyfish-tank/manifest.json"),
);
assert.deepEqual(
  Object.fromEntries(manifest.settings.map((s) => [s.key, s.default])),
  DEFAULTS,
);
quiet.dispose();
quiet.dispose();
assert.equal(quiet.jellies.length, 0);
assert.equal(quiet.wakes.length, 0);
console.log(
  "Jellyfish model: bell/thrust coupling, recovery, size-dependent rhythm, delayed chains, anchor/length constraints, deterministic steps, local light/wake, expiry, zoom, quality and disposal passed. Max link strain:",
  strain.toFixed(3),
);
