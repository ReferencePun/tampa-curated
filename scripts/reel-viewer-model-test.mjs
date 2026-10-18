import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULTS,
  PRESETS,
  options,
  createTransport,
  readReel,
  shiftScene,
} from "../src/creative-lab/experiments/view-master/model.js";
import { project } from "../src/creative-lab/experiments/view-master/renderer.js";
import { REELS } from "../src/creative-lab/experiments/view-master/reels.js";
import { validateSettings } from "../src/creative-lab/shared/presets.js";
const manifest = JSON.parse(
  readFileSync(
    "src/creative-lab/experiments/view-master/manifest.json",
    "utf8",
  ),
);
assert.deepEqual(validateSettings(manifest, DEFAULTS), DEFAULTS);
for (const p of Object.values(PRESETS))
  assert.deepEqual(validateSettings(manifest, p.settings), options(p.settings));
assert.doesNotThrow(() =>
  validateSettings(
    manifest,
    options({ depth: 0.736, zoom: 99, spacing: -1, interval: 3.14 }),
  ),
);
const cycle = createTransport(6);
for (let i = 0; i < 6; i++) cycle.advance(1);
assert.equal(
  cycle.state().rotation,
  6,
  "A complete forward reel turn does not unwind at the wrap",
);
cycle.advance(-1);
assert.equal(cycle.state().rotation, 5);
const t = createTransport(6);
t.advance(-1);
assert.equal(t.state().index, 5);
t.advance(1);
assert.equal(t.state().index, 0);
for (let i = 0; i < 600; i++) t.advance(1);
assert.equal(t.state().index, 0);
t.advance(1, true);
assert.equal(t.state().index, 5);
t.tick(0.26);
assert.equal(t.state().phase, 0.5);
t.tick(10);
assert.equal(t.state().phase, 1);
t.insert(false);
assert.equal(t.advance(), false);
assert.equal(t.state().index, 5);
t.insert(true);
t.advance();
assert.equal(t.state().index, 0);
t.reset(3);
assert.equal(t.state().count, 3);
for (const [key, r] of Object.entries(REELS)) {
  const input = JSON.parse(
    JSON.stringify(r).replaceAll("file:///", "https://local.example/"),
  );
  const valid = readReel(input, { allowExternal: true });
  assert.equal(valid.scenes.length, r.scenes.length);
  assert.equal(
    readReel(JSON.stringify(valid), { allowExternal: true }).title,
    r.title,
  );
  if (key !== "photos") assert.doesNotThrow(() => readReel(r));
}
const moved = shiftScene(REELS.atlas, 0, 1);
assert.equal(moved.reel.scenes[1].title, REELS.atlas.scenes[0].title);
assert.notEqual(moved.reel.scenes[0].title, REELS.atlas.scenes[0].title);
assert.throws(() => readReel({ version: 2, scenes: [] }));
assert.throws(() =>
  readReel({ ...REELS.atlas, scenes: Array(25).fill(REELS.atlas.scenes[0]) }),
);
assert.throws(() =>
  readReel({
    ...REELS.atlas,
    scenes: [{ kind: "world", theme: "unsupported" }],
  }),
);
assert.throws(() =>
  readReel({
    version: 1,
    scenes: [{ kind: "photo", src: "https://example.com/tracker.png" }],
  }),
);
assert.throws(() =>
  readReel(
    { version: 1, scenes: [{ kind: "photo", src: "javascript:alert(1)" }] },
    { allowExternal: true },
  ),
);
const stereo = readReel({
  version: 1,
  scenes: [
    {
      kind: "stereo-pair",
      left: "data:image/png;base64,AAAA",
      right: "data:image/png;base64,BBBB",
    },
  ],
});
assert.equal(stereo.scenes[0].kind, "stereo-pair");
const disparity = (p) => project(p, -0.3)[0] - project(p, 0.3)[0];
assert.ok(Math.abs(disparity([0, 0, 0])) < 1e-10);
assert.ok(disparity([0, 0, 3]) > 0);
assert.ok(disparity([0, 0, -3]) < 0);
assert.equal(project([2, 1, 2], 0)[1], project([2, 1, 2], 0.5)[1]);
console.log(
  "Reel model: schema, source validation, preset steps, reversible transport, reordering and off-axis convergence passed.",
);
