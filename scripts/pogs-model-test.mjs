import assert from "node:assert/strict";
import {
  DiscGame,
  planStrike,
  sampleDisc,
  options,
  parseAlbum,
  validateStack,
} from "../src/creative-lab/experiments/pogs/model.js";
import {
  DISCS,
  DEFAULTS,
  PRESETS,
} from "../src/creative-lab/experiments/pogs/catalog.js";
const game = new DiscGame(),
  shot = { x: 12, y: 0, power: 0.7 };
const a = planStrike(game.stack, shot, DEFAULTS),
  b = planStrike(game.stack, shot, DEFAULTS);
assert.deepEqual(a, b);
for (const p of a.plans) {
  const end = sampleDisc(p, a.duration);
  assert.equal(end.z, 0);
  assert.equal(end.angle, p.halfTurns * Math.PI);
  assert.equal(p.front, p.halfTurns % 2 === 1);
  assert.ok(Number.isFinite(sampleDisc(p, 0.7).angle));
}
const miss = planStrike(game.stack, { x: 250, y: 170, power: 1 }, DEFAULTS);
assert.equal(miss.contact, 0);
assert.equal(miss.plans.filter((p) => p.front).length, 0);
for (const p of miss.plans) assert.equal(sampleDisc(p, 2, false).x, 0);
const variants = [
  { power: 0.3 },
  { angle: 0 },
  { friction: 0.9 },
  { slammer: "wood" },
  { surface: "wood" },
];
for (const v of variants) {
  const c = { ...DEFAULTS, ...v },
    q = planStrike(game.stack, { ...shot, power: c.power }, c);
  assert.notEqual(q.energy, a.energy);
  assert.notDeepEqual(
    q.plans.map((p) => p.angle),
    a.plans.map((p) => p.angle),
  );
}
const style = planStrike(game.stack, shot, { ...DEFAULTS, style: "holo" });
assert.deepEqual(style, a, "Visual finish does not reroll the game");
const order = [...game.original].reverse(),
  reordered = new DiscGame(DEFAULTS, { stack: order });
assert.notDeepEqual(
  planStrike(reordered.stack, shot, DEFAULTS).plans.map((p) => [p.id, p.angle]),
  a.plans.map((p) => [p.id, p.angle]),
);
assert.equal(game.collect(), false);
assert.ok(game.strike(shot));
assert.equal(game.strike(shot), false);
game.advance(3);
assert.equal(game.phase, "result");
assert.equal(game.you.length, 0);
const won = game.state().pending;
assert.ok(won > 0 && won < 8);
assert.ok(game.collect());
assert.equal(game.collect(), false);
assert.equal(game.you.length, won);
assert.equal(
  game.state().left,
  8 - won,
  "Banked discs leave the stack counter immediately",
);
for (const p of game.poses().filter((p) => !p.front))
  assert.equal(Math.round(p.angle / Math.PI) % 2, 0);
game.advance(1);
assert.equal(game.stack.length, 8 - won);
assert.equal(game.phase, "ready");
function bestShot(g) {
  let best = null;
  for (const power of [0.2, 0.35, 0.5, 0.65, 0.8, 1])
    for (const x of [0, 18, 35]) {
      const p = planStrike(g.stack, { x, y: 0, power }, g.config),
        n = p.plans.filter((p) => p.front).length;
      if (!best || n > best.n) best = { n, x, y: 0, power };
    }
  return best;
}
for (const [name, p] of Object.entries(PRESETS)) {
  const g = new DiscGame({ ...p.settings, mode: "practice" });
  let strikes = 0;
  while (g.phase !== "complete" && strikes++ < 20) {
    const s = bestShot(g);
    assert.ok(s.n > 0, `${name} must remain winnable`);
    g.strike(s);
    g.advance(3);
    g.collect();
    g.advance(1);
  }
  assert.equal(g.phase, "complete");
  assert.equal(g.you.length, g.original.length);
  assert.equal(g.stack.length, 0);
}
const events = [],
  cpu = new DiscGame(
    { ...DEFAULTS, mode: "cpu", stackSize: 16 },
    { event: (e) => events.push(e) },
  );
let iterations = 0;
while (cpu.phase !== "complete" && iterations++ < 10000) {
  if (cpu.phase === "ready" && cpu.actor === "you") cpu.strike(bestShot(cpu));
  if (cpu.phase === "result" && cpu.actor === "you") cpu.collect();
  cpu.advance(0.02);
}
assert.equal(cpu.phase, "complete");
assert.equal(cpu.you.length + cpu.cpu.length, 16);
assert.ok(events.some((e) => e.type === "strike" && e.actor === "cpu"));
assert.ok(events.some((e) => e.type === "collect" && e.actor === "cpu"));
assert.equal(events.filter((e) => e.type === "complete").length, 1);
const fast = new DiscGame(),
  slow = new DiscGame();
fast.strike(shot);
slow.strike(shot);
fast.advance(3);
for (let i = 0; i < 180; i++) slow.advance(1 / 60);
assert.equal(fast.state().pending, slow.state().pending);
assert.deepEqual(fast.poses(), slow.poses());
const custom = new DiscGame(
  { stackSize: 3 },
  {
    catalog: [
      { id: "one", name: "First" },
      { id: "two", name: "Second" },
    ],
    stack: ["two", "one", "two"],
  },
);
assert.deepEqual(custom.original, ["two", "one", "two"]);
assert.throws(() => validateStack(["missing"]));
assert.throws(() => validateStack(Array(17).fill(DISCS[0].id)));
assert.throws(
  () =>
    new DiscGame(
      {},
      {
        catalog: [
          { id: "same", name: "One" },
          { id: "same", name: "Two" },
        ],
      },
    ),
);
const album = {
  type: "odd-company-album",
  version: 1,
  counts: { "moon-moth": 3, "sun-eater": 0 },
};
assert.deepEqual(parseAlbum(album), { "moon-moth": 3 });
for (const counts of [
  { unknown: 1 },
  { "moon-moth": -1 },
  { "moon-moth": 1.5 },
  { "moon-moth": 100000 },
])
  assert.throws(() => parseAlbum({ ...album, counts }));
assert.equal(options({ stackSize: 99 }).stackSize, 16);
console.log(
  "Disc model: deterministic plans, actual orientation scoring, misses, material/power/tilt/friction/order effects, all presets winnable, no double bank, CPU round, frame-rate-independent results, custom catalog and album validation passed.",
);

// Extreme physical controls keep the complete projected disc inside the canvas.
const extreme = new DiscGame({
  ...DEFAULTS,
  stackSize: 16,
  slammer: "steel",
  friction: 0.1,
  surface: "wood",
  angle: 65,
});
const high = planStrike(
  extreme.stack,
  { x: 15, y: 0, power: 1 },
  extreme.config,
);
for (const d of high.plans)
  for (let i = 0; i <= 150; i++) {
    const p = sampleDisc(d, (high.duration * i) / 150),
      y = 290 + p.y * 0.68 - p.z * 0.85;
    assert.ok(
      y - 45 >= 0 && y + 45 <= 680,
      "Extreme flights remain inside the visible table",
    );
  }
