import assert from "node:assert/strict";
import * as THREE from "three";
import {
  DEFAULTS,
  PRESETS,
  options,
  hingeAngle,
  actionPose,
  validateWorld,
} from "../src/creative-lab/experiments/polly-pocket-world/model.js";
import { WORLDS } from "../src/creative-lab/experiments/polly-pocket-world/worlds.js";
import { createToy } from "../src/creative-lab/experiments/polly-pocket-world/toy.js";
import { readFile } from "node:fs/promises";
import { validateSettings } from "../src/creative-lab/shared/presets.js";
const manifest = JSON.parse(
  await readFile(
    "src/creative-lab/experiments/polly-pocket-world/manifest.json",
    "utf8",
  ),
);
for (const p of Object.values(PRESETS))
  assert.deepEqual(validateSettings(manifest, p.settings), p.settings);
assert.equal(hingeAngle(0), -0);
assert.ok(Math.abs(hingeAngle(100) + (118 * Math.PI) / 180) < 1e-12);
assert.equal(options({ enter: true, open: 20 }).open, 100);
for (const [id, def] of Object.entries(WORLDS)) {
  assert.equal(validateWorld(def), def);
  const toy = createToy(def, { ...DEFAULTS, world: id });
  const fixed = toy.lid.position.toArray();
  const states = [];
  for (let i = 0; i <= 100; i++) {
    toy.apply(i, [i, i, i]);
    states.push({
      lid: toy.lid.rotation.x,
      mechanisms: [...toy.mechanisms.values()].map((m) =>
        m.target.matrixWorld.toArray(),
      ),
    });
    assert.deepEqual(toy.lid.position.toArray(), fixed);
  }
  for (let i = 100; i >= 0; i--) {
    toy.apply(i, [i, i, i]);
    assert.deepEqual(
      {
        lid: toy.lid.rotation.x,
        mechanisms: [...toy.mechanisms.values()].map((m) =>
          m.target.matrixWorld.toArray(),
        ),
      },
      states[i],
    );
  }
  toy.apply(0, [0, 0, 0]);
  const bounds = toy.contentBounds
    .clone()
    .union(new THREE.Box3().setFromObject(toy.interior));
  console.log(
    id,
    JSON.stringify({
      min: bounds.min.toArray(),
      max: bounds.max.toArray(),
      ...toy.counts,
    }),
  );
  assert.ok(
    bounds.max.y < 0.7 + def.shell.lidHeight - 0.25,
    `${id} fits beneath the closed cover`,
  );
  assert.ok(
    bounds.min.x > -def.shell.width / 2 && bounds.max.x < def.shell.width / 2,
  );
  assert.ok(
    bounds.min.z > -def.shell.depth / 2 && bounds.max.z < def.shell.depth / 2,
  );
  assert.ok(
    toy.counts.instances > 120 && toy.counts.batches < 150,
    "Scenery is batched",
  );
  for (const action of def.actions) {
    const a = actionPose(action, 0),
      b = actionPose(action, 50);
    assert.notDeepEqual(a, b);
  }
  toy.root.traverse((o) => {
    if (o.isMesh) {
      const position = o.geometry.getAttribute("position");
      for (let i = 0; i < position.array.length; i++)
        assert.ok(Number.isFinite(position.array[i]));
    }
  });
  toy.dispose();
  assert.equal(toy.root.children.length, 0);
}
assert.throws(() =>
  validateWorld({
    ...WORLDS.beach,
    pieces: [WORLDS.beach.pieces[0], WORLDS.beach.pieces[0]],
  }),
);
assert.throws(() =>
  validateWorld({
    ...WORLDS.beach,
    actions: [{ target: "missing", kind: "hinge" }],
  }),
);
console.log(
  "Pocket worlds: three valid presets, finite instanced geometry, closed-cover containment, fixed hinge and reversible mechanism transforms passed.",
);
