import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AnemoneField,
  DEFAULTS,
  PRESETS,
  options,
  pulseAt,
} from "../src/creative-lab/experiments/sea-anemone-field/model.js";
const advance = (f, s) => {
  for (let i = 0; i < Math.round(s * 120); i++) f.advance(1 / 120);
};
const f = new AnemoneField({ ...DEFAULTS, speed: 1 }),
  g = new AnemoneField({ ...DEFAULTS, speed: 1 });
assert.equal(f.paths.length, 64 * 30);
assert.deepEqual(
  f.paths.map((p) => [...p.points]),
  g.paths.map((p) => [...p.points]),
);
const anchors = f.paths.map((p) => [...p.points.slice(0, 2)]),
  tips = f.paths.map((p) => [...p.points.slice(-2)]);
advance(f, 1.5);
for (let i = 0; i < 180; i++) g.advance(1 / 120);
assert.equal(f.time, g.time);
assert.deepEqual(
  f.paths.map((p) => [...p.points]),
  g.paths.map((p) => [...p.points]),
);
assert.ok(
  f.paths.filter(
    (p, i) =>
      Math.hypot(p.points[16] - tips[i][0], p.points[17] - tips[i][1]) > 0.0005,
  ).length > 500,
);
assert.deepEqual(
  f.paths.map((p) => [...p.points.slice(0, 2)]),
  anchors,
  "Idle motion must leave roots fixed",
);
const r = f.colonies[30],
  point = [r.x + 0.045 / f.aspect, r.y + 0.02];
f.point(...point);
advance(f, 1);
assert.ok(r.dx > 0 && r.dy > 0);
const near = Math.hypot(r.dx, r.dy),
  far = f.colonies.find(
    (r) => Math.hypot(r.x - point[0], r.y - point[1]) > 0.6,
  );
assert.ok(near > 0.01);
assert.equal(far.dx, 0);
assert.equal(far.dy, 0);
f.release();
advance(f, 5);
assert.ok(Math.hypot(r.dx, r.dy) < near * 0.05, "Release must settle");
f.update({ ...f.config, mode: "avoid" });
f.point(...point, true);
advance(f, 1);
assert.ok(r.dx < 0 && r.dy < 0 && r.curl > 0.05);
assert.deepEqual(
  f.paths.map((p) => [...p.points.slice(0, 2)]),
  anchors,
  "Recoil must leave roots fixed",
);
f.update({ ...f.config, mode: "mixed", ripple: 0 });
f.point(r.x + 0.18 / f.aspect, r.y);
f.settleInput();
assert.ok(r.dx > 0, "Mixed reaches from afar");
f.point(r.x + 0.02 / f.aspect, r.y);
f.settleInput();
assert.ok(r.dx < 0, "Mixed recoils nearby");
const time = f.time;
f.settleInput();
assert.equal(f.time, time);
f.update({ ...f.config, attraction: 0, avoidance: 0, ripple: 0, sway: 0 });
f.settleInput();
assert.equal(r.dx, 0);
assert.equal(r.curl, 0);
const pulse = { x: 0, y: 0, time: 0, power: 1 };
assert.ok(pulseAt(pulse, 0.24, 0, 1) > 0.2);
assert.ok(
  Math.abs(pulseAt(pulse, 0.24, 0, 1, 0.08)) < 0.001,
  "Radius changes ripple propagation",
);
assert.ok(Math.abs(pulseAt(pulse, 0.24, 0, 0)) < 0.001);
assert.equal(pulseAt(pulse, 0, 0, 4), 0);
f.update({ ...f.config, mode: "ripple", ripple: 1 });
f.point(r.x, r.y);
advance(f, 0.2);
f.point(r.x + 0.04, r.y);
assert.ok(f.pulses.length > 0);
advance(f, 4);
assert.equal(f.pulses.length, 0);
for (let i = 0; i < 100; i++) {
  f.point((i * 0.17) % 1, (i * 0.23) % 1);
  advance(f, 0.1);
}
assert.ok(f.pulses.length <= 24);
assert.ok(
  f.colonies.every((r) =>
    [r.dx, r.dy, r.curl, r.vx, r.vy].every(Number.isFinite),
  ),
);
for (const p of Object.values(PRESETS)) {
  assert.deepEqual(options(p.settings), p.settings);
  f.update(p.settings);
  assert.equal(f.paths.length, p.settings.density * p.settings.tendrils);
  assert.ok(f.paths.every((p) => p.points.every(Number.isFinite)));
}
f.resize(0.4);
assert.equal(f.aspect, 0.4);
f.resize(6);
assert.equal(f.aspect, 6);
assert.equal(options({ density: 10000 }).density, 140);
assert.equal(options({ background: "url(x)" }).background, DEFAULTS.background);
assert.equal(options({ speed: NaN }).speed, DEFAULTS.speed);
assert.deepEqual(
  JSON.parse(
    await readFile(
      "src/creative-lab/experiments/sea-anemone-field/config.json",
    ),
  ),
  DEFAULTS,
);
const manifest = JSON.parse(
  await readFile(
    "src/creative-lab/experiments/sea-anemone-field/manifest.json",
  ),
);
assert.deepEqual(
  Object.fromEntries(manifest.settings.map((s) => [s.key, s.default])),
  DEFAULTS,
);
f.dispose();
f.dispose();
assert.equal(f.paths.length, 0);
assert.equal(f.colonies.length, 0);
console.log(
  "Sea anemone: seeded crowns, independent idle motion, fixed roots, local attraction/recoil, mixed forces, pulse travel/expiry/bounds, deterministic steps, settling, controls, palettes and disposal passed.",
);
