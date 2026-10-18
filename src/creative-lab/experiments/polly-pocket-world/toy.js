import * as THREE from "three";
import { createKit, batch } from "./geometry.js";
import { PALETTES, validateWorld, hingeAngle, actionPose } from "./model.js";
export function createToy(definition, settings = {}, customBuilders = {}) {
  const def = validateWorld(definition),
    palette =
      def.palette && settings.palette === "original"
        ? { ...PALETTES.beach, ...def.palette }
        : PALETTES[
            settings.palette === "original" ? def.id : settings.palette
          ] || PALETTES.beach,
    kit = createKit(palette),
    root = new THREE.Group(),
    base = new THREE.Group(),
    lid = new THREE.Group(),
    interior = new THREE.Group(),
    objects = new Map(),
    mechanisms = new Map(),
    instanced = [];
  const { width: w, depth: d, radius: r, lidHeight } = def.shell;
  root.add(base);
  lid.position.set(0, 0.7, -d / 2);
  lid.userData.dynamic = true;
  root.add(lid);
  base.add(interior);
  kit.rounded(base, "shell", [0, -0.42, 0], w, d, 0.26, r);
  kit.rounded(base, "shell", [0, -0.14, 0], w, d, 0.72, r, 0.24);
  kit.rounded(
    base,
    "trim",
    [0, 0.6, 0],
    w - 0.08,
    d - 0.08,
    0.045,
    r - 0.03,
    0.12,
  );
  kit.rounded(base, "ground", [0, -0.08, 0], w - 0.5, d - 0.5, 0.09, r - 0.22);
  kit.rounded(lid, "shell", [0, 0, d / 2], w, d, lidHeight, r, 0.23);
  kit.rounded(lid, "shell", [0, lidHeight, d / 2], w, d, 0.18, r);
  kit.rounded(
    lid,
    "trim",
    [0, -0.015, d / 2],
    w - 0.08,
    d - 0.08,
    0.035,
    r - 0.03,
    0.12,
  );
  // The closed exterior has its own original molded medallion and radiating seams.
  kit.cylinder(lid, "trim", [0, lidHeight + 0.21, d / 2], 1.22, 0.055);
  kit.cylinder(lid, "shell", [0, lidHeight + 0.25, d / 2], 1.12, 0.04);
  kit.torus(lid, "accent", [0, lidHeight + 0.29, d / 2], 0.81, 0.022);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const bead = kit.ball(
      lid,
      "trim",
      [Math.cos(a) * 0.51, lidHeight + 0.3, d / 2 + Math.sin(a) * 0.51],
      [0.21, 0.045, 0.07],
    );
    bead.rotation.y = -a;
  }
  kit.ball(lid, "accent", [0, lidHeight + 0.31, d / 2], [0.15, 0.06, 0.15]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    kit.ball(
      lid,
      "trim",
      [Math.cos(a) * 3.95, lidHeight + 0.2, d / 2 + Math.sin(a) * 2.9],
      [0.055, 0.035, 0.055],
    );
  }
  for (const x of [-3, -1.5, 0, 1.5, 3]) {
    const h = kit.cylinder(
      base,
      x % 3 ? "accent" : "shell",
      [x, 0.69, -d / 2],
      0.2,
      1.35,
    );
    h.rotation.z = Math.PI / 2;
  }
  kit.rounded(base, "trim", [0, 0.06, d / 2 + 0.08], 1.05, 0.32, 0.38, 0.12);
  kit.rounded(lid, "accent", [0, 0.1, d + 0.08], 0.66, 0.25, 0.26, 0.1);
  // Recessed inside cover: a second molded miniature, physically attached to the lid.
  const backdrop = new THREE.Group();
  backdrop.position.set(0, lidHeight - 0.015, d / 2);
  backdrop.rotation.x = Math.PI;
  lid.add(backdrop);
  kit.rounded(backdrop, "water", [0, 0, 0], w - 0.65, d - 0.65, 0.04, r - 0.3);
  for (let i = 0; i < 3; i++) {
    const cloud = new THREE.Group();
    cloud.position.set(-2.8 + i * 2.6, 0.09, -1.8 + (i % 2) * 0.4);
    backdrop.add(cloud);
    for (let j = 0; j < 3; j++)
      kit.ball(
        cloud,
        "trim",
        [(j - 1) * 0.3, 0.04, Math.sin(j) * 0.1],
        [0.4, 0.08, 0.24],
      );
  }
  if (def.lid === "skyline") {
    for (let i = 0; i < 8; i++) {
      const h = 0.5 + (i % 3) * 0.27;
      kit.rounded(
        backdrop,
        i % 2 ? "wall" : "roof",
        [-3.2 + i * 0.9, 0.06, 1.5 - h / 2],
        0.65,
        h,
        0.1,
        0.08,
      );
      for (let j = 0; j < 2; j++)
        kit.box(
          backdrop,
          "trim",
          [-3.35 + i * 0.9 + j * 0.28, 0.18, 1.15 - h / 2],
          [0.12, 0.025, 0.15],
        );
    }
  } else {
    kit.cylinder(backdrop, "accent", [-1.6, 0.1, 0.4], 0.8, 0.12);
    if (def.lid === "moon")
      kit.cylinder(backdrop, "water", [-1.3, 0.18, 0.25], 0.72, 0.05);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      kit.ball(
        backdrop,
        "trim",
        [Math.cos(a) * 2.7, 0.12, 0.9 + Math.sin(a) * 1.1],
        [0.08, 0.045, 0.08],
      );
    }
    for (let i = 0; i < 3; i++) {
      const pts = [];
      for (let j = 0; j < 12; j++)
        pts.push([
          -3.3 + j * 0.6,
          0.15,
          1.75 + i * 0.28 + Math.sin(j * 0.7 + i) * 0.13,
        ]);
      kit.tube(backdrop, def.lid === "moon" ? "leaf" : "trim", pts, 0.025);
    }
  }
  const builders = { ...kit.builders, ...customBuilders };
  for (const item of def.pieces) {
    const g = new THREE.Group();
    g.name = item.id;
    g.position.fromArray(item.position);
    if (item.scale) g.scale.fromArray(item.scale);
    g.rotation.y = item.rotation || 0;
    interior.add(g);
    if (!builders[item.type]) {
      kit.dispose();
      throw Error("Unknown piece type: " + item.type);
    }
    const result = builders[item.type](g, item, kit) || {};
    objects.set(item.id, { root: g, ...result });
  }
  for (const path of def.paths || []) {
    const points = path.map(([x, z]) => [x, 0.035, z]);
    kit.tube(interior, "trim", points, 0.16);
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const count = 18 * (settings.density || 2);
    for (let i = 0; i < count; i++) {
      const p = curve.getPoint(i / count);
      kit.ball(interior, "accent", [p.x, 0.195, p.z], [0.035, 0.008, 0.035]);
    }
  }
  if (def.track) {
    const curve = new THREE.CatmullRomCurve3(
      def.track.map(([x, z]) => new THREE.Vector3(x, 0.035, z)),
      true,
    );
    const pts = curve.getPoints(80).map((v) => v.toArray());
    kit.tube(interior, "dark", pts, 0.17, true);
    kit.tube(interior, "trim", pts, 0.025, true);
  }
  for (let i = 0; i < (settings.density || 2) * 18; i++) {
    const a = i * 2.39996,
      x = Math.cos(a) * (3.8 + (i % 2) * 0.2),
      z = Math.sin(a) * 2.8;
    kit.ball(
      interior,
      def.id === "garden" ? (i % 3 ? "roof" : "accent") : "trim",
      [x, 0.05, z],
      [0.08, 0.05, 0.065],
    );
    if ((settings.density || 2) > 1 && i % 3 === 0)
      kit.ball(
        interior,
        "leaf",
        [x + 0.07, 0.08, z + 0.08],
        [0.09, 0.07, 0.04],
      );
  }
  for (const [index, action] of def.actions.entries()) {
    const object = objects.get(action.target);
    if (action.kind === "path") object.root.userData.dynamic = true;
    const target = object.pivot || object.root;
    mechanisms.set(action.id, {
      definition: action,
      object,
      target,
      base: target.position.clone(),
      index,
      curve: action.points
        ? new THREE.CatmullRomCurve3(
            action.points.map(
              ([x, z]) => new THREE.Vector3(x, object.root.position.y, z),
            ),
            true,
          )
        : null,
    });
  }
  root.updateMatrixWorld(true);
  const contentBounds = new THREE.Box3().setFromObject(interior);
  batch(root);
  root.traverse((o) => {
    if (o.isInstancedMesh) instanced.push(o);
  });
  function apply(open, states) {
    lid.rotation.x = hingeAngle(open);
    for (const m of mechanisms.values()) {
      const value = states[m.index] || 0,
        pose = actionPose(m.definition, value);
      if (m.definition.kind === "hinge") {
        if (m.object.pivots)
          m.object.pivots.forEach((p) => (p.rotation.x = pose.angle));
        else m.target.rotation.x = pose.angle;
      } else if (m.definition.kind === "spin") m.target.rotation.y = pose.angle;
      else if (m.definition.kind === "lift")
        m.target.position.y = m.base.y + pose.lift;
      else {
        const point = m.curve.getPointAt(pose.path),
          tangent = m.curve.getTangentAt(pose.path);
        m.object.root.position.copy(point);
        m.object.root.rotation.y = Math.atan2(tangent.x, tangent.z);
      }
    }
    root.updateMatrixWorld(true);
  }
  const targets = def.actions.map((a) => ({
    id: a.id,
    label: a.label,
    description: a.description,
    point: new THREE.Vector3(...a.marker),
  }));
  function dispose() {
    instanced.forEach((m) => m.dispose());
    kit.dispose();
    root.clear();
  }
  apply(0, [0, 0, 0]);
  return {
    root,
    lid,
    base,
    interior,
    objects,
    mechanisms,
    targets,
    palette,
    definition: def,
    apply,
    dispose,
    contentBounds,
    counts: {
      instances: instanced.reduce((n, m) => n + m.count, 0),
      batches: instanced.length,
    },
  };
}
