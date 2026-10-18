import * as THREE from "three";
export function roundedShape(w, d, r, hole = false) {
  const s = hole ? new THREE.Path() : new THREE.Shape(),
    x = -w / 2,
    z = -d / 2;
  s.moveTo(x + r, z);
  s.lineTo(x + w - r, z);
  s.quadraticCurveTo(x + w, z, x + w, z + r);
  s.lineTo(x + w, z + d - r);
  s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
  s.lineTo(x + r, z + d);
  s.quadraticCurveTo(x, z + d, x, z + d - r);
  s.lineTo(x, z + r);
  s.quadraticCurveTo(x, z, x + r, z);
  return s;
}
export function createKit(palette) {
  const geometries = new Map(),
    materials = new Map();
  const material = (key) => {
    const color = palette[key] || key;
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.34,
          metalness: 0,
          clearcoat: 0.42,
          clearcoatRoughness: 0.3,
        }),
      );
    return materials.get(color);
  };
  const geo = (key, make) => {
    if (!geometries.has(key)) geometries.set(key, make());
    return geometries.get(key);
  };
  const mesh = (parent, g, color, position = [0, 0, 0], scale = [1, 1, 1]) => {
    const m = new THREE.Mesh(g, material(color));
    m.position.fromArray(position);
    m.scale.fromArray(scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (p, color, pos, scale) =>
    mesh(
      p,
      geo("box", () => new THREE.BoxGeometry(1, 1, 1)),
      color,
      pos,
      scale,
    );
  const ball = (p, color, pos, scale = [1, 1, 1]) =>
    mesh(
      p,
      geo("ball", () => new THREE.SphereGeometry(1, 16, 12)),
      color,
      pos,
      scale,
    );
  const cylinder = (p, color, pos, r = 0.3, h = 0.5, rt = r) =>
    mesh(
      p,
      geo(`cyl${rt / r}`, () => new THREE.CylinderGeometry(rt / r, 1, 1, 24)),
      color,
      pos,
      [r, h, r],
    );
  const cone = (p, color, pos, r = 0.5, h = 0.5) =>
    mesh(
      p,
      geo("cone", () => new THREE.ConeGeometry(1, 1, 32)),
      color,
      pos,
      [r, h, r],
    );
  function rounded(p, color, pos, w, d, h, r = 0.2, ring = 0) {
    const key = `rounded${w},${d},${h},${r},${ring}`;
    const g = geo(key, () => {
      const shape = roundedShape(w, d, r);
      if (ring)
        shape.holes.push(
          roundedShape(
            w - ring * 2,
            d - ring * 2,
            Math.max(0.1, r - ring),
            true,
          ),
        );
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: h,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.035,
        bevelThickness: 0.035,
        curveSegments: 12,
      });
      geometry.rotateX(-Math.PI / 2);
      return geometry;
    });
    return mesh(p, g, color, pos);
  }
  function torus(p, color, pos, r = 0.4, t = 0.035) {
    const m = mesh(
      p,
      geo(`torus${r},${t}`, () => new THREE.TorusGeometry(r, t, 8, 40)),
      color,
      pos,
    );
    m.rotation.x = Math.PI / 2;
    return m;
  }
  function tube(p, color, points, r = 0.04, closed = false) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((v) => new THREE.Vector3(...v)),
      closed,
      "centripetal",
    );
    const g = new THREE.TubeGeometry(
      curve,
      Math.max(20, points.length * 8),
      r,
      6,
      closed,
    );
    geometries.set("tube" + geometries.size, g);
    return mesh(p, g, color);
  }
  function window(p, x, y, z) {
    box(p, "dark", [x, y, z], [0.16, 0.2, 0.025]);
    box(p, "trim", [x, y, z + 0.018], [0.018, 0.22, 0.014]);
    box(p, "trim", [x, y, z + 0.02], [0.18, 0.018, 0.014]);
  }
  function building(p, roof = "roof") {
    rounded(p, "wall", [0, 0.05, 0], 1.1, 0.95, 0.72, 0.12);
    const g = geo(
      "roof",
      () => new THREE.CylinderGeometry(0.83, 0.83, 1.26, 3, 1),
    );
    const m = mesh(p, g, roof, [0, 0.92, 0], [1, 0.88, 1]);
    m.rotation.z = Math.PI / 2;
    m.rotation.y = Math.PI / 2;
    box(p, "dark", [0, 0.27, 0.492], [0.18, 0.43, 0.04]);
    window(p, -0.3, 0.51, 0.49);
    window(p, 0.3, 0.51, 0.49);
    box(p, "trim", [0, 0.05, 0.65], [0.5, 0.1, 0.35]);
    box(p, "trim", [0, 0.8, 0.56], [1.2, 0.055, 0.08]);
  }
  const builders = {
    house(p, def) {
      building(p, def.roof);
    },
    pool(p) {
      cylinder(p, "trim", [0, 0.035, 0], 1, 0.07);
      cylinder(p, "water", [0, 0.081, 0], 0.92, 0.018);
      for (let i = 0; i < 3; i++) {
        const wave = torus(
          p,
          "#c5e2d7",
          [(i - 1) * 0.3, 0.1, (i % 2) * 0.6 - 0.3],
          0.24,
          0.009,
        );
        wave.scale.z = 0.5;
      }
    },
    lighthouse(p) {
      cylinder(p, "wall", [0, 0.53, 0], 0.27, 1, 0.21);
      cylinder(p, "roof", [0, 0.62, 0], 0.254, 0.12);
      cylinder(p, "trim", [0, 1.05, 0], 0.34, 0.08);
      cylinder(p, "dark", [0, 1.17, 0], 0.18, 0.18);
      cone(p, "roof", [0, 1.32, 0], 0.32, 0.18);
      torus(p, "trim", [0, 1.05, 0], 0.32, 0.022);
    },
    palm(p) {
      cylinder(p, "accent", [0, 0.48, 0], 0.065, 0.9, 0.045);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const leaf = ball(
          p,
          "leaf",
          [Math.cos(a) * 0.28, 0.99, Math.sin(a) * 0.28],
          [0.43, 0.045, 0.13],
        );
        leaf.rotation.y = -a;
        leaf.rotation.z = 0.18 * Math.cos(a);
      }
      ball(p, "roof", [0, 0.94, 0], [0.12, 0.1, 0.12]);
    },
    tree(p) {
      cylinder(p, "accent", [0, 0.3, 0], 0.07, 0.6);
      ball(p, "leaf", [0, 0.83, 0], [0.4, 0.5, 0.4]);
      ball(p, "leaf", [0.18, 0.73, 0.1], [0.3, 0.32, 0.3]);
    },
    bridge(p) {
      const pivot = new THREE.Group();
      pivot.userData.dynamic = true;
      pivot.position.set(0, 0.25, -0.65);
      p.add(pivot);
      rounded(pivot, "accent", [0, 0, 0.65], 0.7, 1.3, 0.07, 0.09);
      for (const x of [-0.31, 0.31]) {
        box(pivot, "trim", [x, 0.25, 0.65], [0.045, 0.045, 1.3]);
        for (const z of [0.1, 0.65, 1.2])
          box(pivot, "trim", [x, 0.13, z], [0.045, 0.25, 0.045]);
      }
      for (let i = 0; i < 8; i++)
        box(pivot, "roof", [0, 0.08, 0.06 + i * 0.16], [0.65, 0.015, 0.018]);
      cylinder(p, "dark", [0, 0.25, -0.65], 0.08, 0.9).rotation.z = Math.PI / 2;
      return { pivot };
    },
    boat(p) {
      const hull = ball(p, "roof", [0, 0.18, 0], [0.28, 0.15, 0.55]);
      hull.rotation.y = 0.1;
      box(p, "trim", [0, 0.23, 0], [0.35, 0.08, 0.7]);
      cylinder(p, "accent", [0, 0.65, 0], 0.025, 0.8);
      const g = geo("sail", () => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute([0, 0, 0, 0, 0.7, 0, 0.45, 0, 0], 3),
        );
        g.computeVertexNormals();
        return g;
      });
      const sail = mesh(p, g, "trim", [0.01, 0.38, 0]);
      sail.material.side = THREE.DoubleSide;
      return { pivot: p };
    },
    compartment(p) {
      rounded(p, "wall", [0, 0.02, 0], 1, 0.7, 0.35, 0.13, 0.1);
      rounded(p, "accent", [0, 0.03, 0], 0.65, 0.4, 0.05, 0.08);
      const gift = ball(p, "accent", [0, 0.19, 0], [0.16, 0.08, 0.12]);
      gift.rotation.y = 0.3;
      const pivot = new THREE.Group();
      pivot.position.set(0, 0.4, -0.36);
      pivot.userData.dynamic = true;
      p.add(pivot);
      rounded(pivot, "roof", [0, 0, 0.36], 1.08, 0.77, 0.12, 0.13);
      box(pivot, "trim", [0, 0.08, 0.75], [0.18, 0.1, 0.06]);
      return { pivot };
    },
    umbrella(p) {
      cylinder(p, "trim", [0, 0.4, 0], 0.035, 0.8);
      cone(p, "roof", [0, 0.88, 0], 0.6, 0.23);
      cone(p, "trim", [0, 0.9, 0], 0.14, 0.23);
      cylinder(p, "accent", [0, 0.03, 0], 0.22, 0.055);
    },
    chair(p) {
      box(p, "trim", [0, 0.18, 0], [0.32, 0.055, 0.62]);
      const back = box(p, "roof", [0, 0.35, -0.25], [0.32, 0.4, 0.05]);
      back.rotation.x = -0.3;
      for (const x of [-0.12, 0.12])
        for (const z of [-0.22, 0.22])
          box(p, "accent", [x, 0.09, z], [0.035, 0.18, 0.035]);
    },
    buoy(p) {
      ball(p, "roof", [0, 0.2, 0], [0.12, 0.16, 0.12]);
      torus(p, "trim", [0, 0.2, 0], 0.13, 0.025);
    },
    steps(p) {
      for (let i = 0; i < 4; i++)
        box(
          p,
          "trim",
          [0, 0.04 + i * 0.035, i * 0.12],
          [0.48, 0.07 + i * 0.07, 0.15],
        );
    },
    fountain(p) {
      cylinder(p, "trim", [0, 0.12, 0], 0.8, 0.2);
      cylinder(p, "water", [0, 0.23, 0], 0.69, 0.035);
      cylinder(p, "wall", [0, 0.4, 0], 0.13, 0.4);
      const pivot = new THREE.Group();
      pivot.position.y = 0.58;
      pivot.userData.dynamic = true;
      p.add(pivot);
      cylinder(pivot, "accent", [0, 0, 0], 0.35, 0.09);
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        const m = ball(
          pivot,
          "water",
          [Math.cos(a) * 0.32, 0.17, Math.sin(a) * 0.32],
          [0.12, 0.2, 0.12],
        );
        m.rotation.z = 0.3;
      }
      ball(pivot, "trim", [0, 0.25, 0], [0.1, 0.1, 0.1]);
      return { pivot };
    },
    tram(p) {
      rounded(p, "roof", [0, 0.16, 0], 0.55, 1, 0.44, 0.1);
      rounded(p, "trim", [0, 0.61, 0], 0.64, 1.1, 0.075, 0.12);
      for (const z of [-0.3, 0, 0.3])
        for (const x of [-0.285, 0.285])
          box(p, "dark", [x, 0.44, z], [0.02, 0.2, 0.2]);
      box(p, "accent", [0, 0.4, 0.51], [0.4, 0.2, 0.025]);
      for (const x of [-0.28, 0.28])
        for (const z of [-0.34, 0.34]) {
          const m = cylinder(p, "dark", [x, 0.16, z], 0.1, 0.05);
          m.rotation.z = Math.PI / 2;
        }
      return { pivot: p };
    },
    bench(p) {
      box(p, "accent", [0, 0.24, 0], [0.75, 0.07, 0.3]);
      box(p, "accent", [0, 0.42, -0.16], [0.75, 0.3, 0.05]);
      for (const x of [-0.25, 0.25])
        box(p, "dark", [x, 0.13, 0], [0.05, 0.24, 0.3]);
    },
    clock(p) {
      cylinder(p, "dark", [0, 0.45, 0], 0.04, 0.9);
      const m = cylinder(p, "trim", [0, 1, 0], 0.22, 0.06);
      m.rotation.x = Math.PI / 2;
      box(p, "dark", [0, 1.06, 0.04], [0.025, 0.12, 0.018]);
      box(p, "dark", [0.06, 1, 0.04], [0.12, 0.025, 0.018]);
      cylinder(p, "accent", [0, 0.03, 0], 0.17, 0.05);
    },
    mushroom(p) {
      cylinder(p, "wall", [0, 0.4, 0], 0.35, 0.75, 0.28);
      ball(p, "roof", [0, 0.84, 0], [0.73, 0.4, 0.7]);
      box(p, "dark", [0, 0.24, 0.35], [0.2, 0.39, 0.04]);
      window(p, 0.22, 0.55, 0.28);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        ball(
          p,
          "trim",
          [Math.cos(a) * 0.45, 0.99 + Math.sin(i) * 0.13, Math.sin(a) * 0.42],
          [0.085, 0.018, 0.085],
        );
      }
    },
    flower(p) {
      cylinder(p, "leaf", [0, 0.22, 0], 0.07, 0.42);
      cylinder(p, "trim", [0, 0.1, 0], 0.4, 0.15);
      const pivots = [];
      for (let i = 0; i < 5; i++) {
        const turn = new THREE.Group();
        turn.rotation.y = (i * Math.PI * 2) / 5;
        p.add(turn);
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.35, 0.12);
        pivot.userData.dynamic = true;
        turn.add(pivot);
        const petal = ball(pivot, "roof", [0, 0.3, 0], [0.19, 0.35, 0.075]);
        petal.rotation.x = 0.14;
        pivots.push(pivot);
      }
      ball(p, "accent", [0, 0.4, 0], [0.14, 0.2, 0.14]);
      return { pivots };
    },
    carousel(p) {
      cylinder(p, "trim", [0, 0.08, 0], 0.68, 0.15);
      const pivot = new THREE.Group();
      pivot.userData.dynamic = true;
      pivot.position.y = 0.17;
      p.add(pivot);
      cylinder(pivot, "accent", [0, 0, 0], 0.6, 0.09);
      cylinder(pivot, "wall", [0, 0.5, 0], 0.06, 1);
      cone(pivot, "roof", [0, 1, 0], 0.7, 0.3);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        cylinder(
          pivot,
          "trim",
          [Math.cos(a) * 0.43, 0.42, Math.sin(a) * 0.43],
          0.025,
          0.8,
        );
        ball(
          pivot,
          "wall",
          [Math.cos(a) * 0.43, 0.25, Math.sin(a) * 0.43],
          [0.18, 0.13, 0.15],
        );
      }
      return { pivot };
    },
    sprout(p) {
      cylinder(p, "roof", [0, 0.2, 0], 0.25, 0.35, 0.35);
      const pivot = new THREE.Group();
      pivot.userData.dynamic = true;
      pivot.position.y = 0.15;
      p.add(pivot);
      cylinder(pivot, "leaf", [0, 0.2, 0], 0.025, 0.4);
      ball(pivot, "accent", [0, 0.39, 0], [0.16, 0.19, 0.12]);
      for (const x of [-0.12, 0.12]) {
        const leaf = ball(pivot, "leaf", [x, 0.23, 0], [0.18, 0.06, 0.09]);
        leaf.rotation.z = x > 0 ? 0.4 : -0.4;
      }
      return { pivot };
    },
    arch(p) {
      for (const x of [-0.38, 0.38]) cylinder(p, "trim", [x, 0.5, 0], 0.07, 1);
      const curve = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI;
        curve.push([Math.cos(a) * 0.38, 1 + Math.sin(a) * 0.28, 0]);
      }
      tube(p, "trim", curve, 0.07);
      for (let i = 0; i < 5; i++)
        ball(
          p,
          "roof",
          [-0.35 + i * 0.17, 1.12 + Math.sin((i / 4) * Math.PI) * 0.2, 0.04],
          [0.08, 0.08, 0.07],
        );
    },
    stone(p) {
      ball(p, "trim", [0, 0.14, 0], [0.24, 0.14, 0.18]);
    },
  };
  return {
    mesh,
    box,
    ball,
    cylinder,
    cone,
    rounded,
    torus,
    tube,
    material,
    builders,
    geometries,
    materials,
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      geometries.clear();
      materials.clear();
    },
  };
}
// Batch fixed mesh siblings while retaining the local coordinate frame of each moving mechanism.
export function batch(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map(),
    remove = [],
    inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
  function walk(node) {
    for (const child of [...node.children]) {
      if (child.userData.dynamic) {
        batch(child);
        continue;
      }
      if (child.isMesh) {
        const key = child.geometry.uuid + child.material.uuid;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push({
          mesh: child,
          matrix: new THREE.Matrix4().multiplyMatrices(
            inverse,
            child.matrixWorld,
          ),
        });
        remove.push(child);
      } else walk(child);
    }
  }
  walk(group);
  for (const list of buckets.values()) {
    const first = list[0].mesh,
      m = new THREE.InstancedMesh(first.geometry, first.material, list.length);
    m.castShadow = true;
    m.receiveShadow = true;
    list.forEach((item, i) => m.setMatrixAt(i, item.matrix));
    m.computeBoundingSphere();
    group.add(m);
  }
  remove.forEach((m) => m.removeFromParent());
}
