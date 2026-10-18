/** Seeded contours, clothed articulated anatomy, and mechanical scenery. No random frame state. */
import { lerp, WALL_PATH, inkStrokes } from "./model.js";
const NS = "http://www.w3.org/2000/svg";
export function node(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs))
    e.setAttribute(key, String(value));
  return e;
}
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const rounded = (n) => Number(n.toFixed(3));
export function pathData(points) {
  return points
    .map((p, i) => (i ? "L" : "M") + p.map(rounded).join(" "))
    .join(" ");
}
export function pen(
  parent,
  points,
  {
    seed = 1,
    rough = 0.6,
    width = 0.7,
    opacity = 1,
    close = false,
    fill = "none",
    dash,
  } = {},
) {
  const p = points.map((v, i) => [
    v[0] + (hash(seed + i * 7) - 0.5) * rough * 1.6,
    v[1] + (hash(seed + i * 7 + 3) - 0.5) * rough * 1.6,
  ]);
  const e = node("path", {
    d: pathData(p) + (close ? "Z" : ""),
    fill,
    stroke: "currentColor",
    "stroke-width": width,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    opacity,
  });
  if (dash) e.setAttribute("stroke-dasharray", dash);
  parent.append(e);
  return e;
}
function limb(g, a, b, c, weight, seed, o) {
  const joints = [a, b, c],
    left = [],
    right = [];
  for (let i = 0; i < joints.length; i++) {
    const from = joints[Math.max(0, i - 1)],
      to = joints[Math.min(2, i + 1)],
      l = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1,
      n = [-(to[1] - from[1]) / l, (to[0] - from[0]) / l],
      w = weight * [1, 0.74, 0.45][i];
    left.push([joints[i][0] + n[0] * w, joints[i][1] + n[1] * w]);
    right.push([joints[i][0] - n[0] * w, joints[i][1] - n[1] * w]);
  }
  pen(g, [...left, ...right.reverse()], {
    ...o,
    seed,
    close: true,
    fill: "#f1ebde",
  });
  pen(g, [lerp(a, b, 0.22), [b[0] + 2, b[1] - 2], lerp(b, c, 0.45)], {
    ...o,
    seed: seed + 20,
    width: o.width * 0.55,
    opacity: 0.7,
  });
  for (let i = 0; i < 4; i++) {
    const v = lerp(a, b, 0.2 + i * 0.15);
    pen(
      g,
      [
        [v[0] - weight * 0.7, v[1] - 2],
        [v[0] + weight * 0.7, v[1] + 2.6],
      ],
      { ...o, seed: seed + i + 40, width: o.width * 0.45, opacity: 0.5 },
    );
  }
}
export function character(parent, state, settings) {
  const g = node("g", { "data-worker": state.activity });
  parent.append(g);
  const {
      hip: h,
      shoulder: s,
      neck: n,
      head,
      elbows,
      knees,
      hands,
      feet,
    } = state.pose,
    scale = state.size,
    o = {
      rough: settings.irregularity,
      width: settings.stroke,
      seed: 41,
      dash: settings.irregularity > 0.1 ? "19 .7 8 .5" : undefined,
    },
    kind =
      settings.character === "crew"
        ? {
            hammer: "apron",
            ladder: "coat",
            rope: "draughtsman",
            paint: "coat",
            carry: "apron",
          }[state.activity]
        : settings.character,
    coat = kind === "coat",
    apron = kind === "apron";
  for (let i = 0; i < 2; i++) {
    limb(
      g,
      [h[0] + (i ? 4 : -3) * scale, h[1]],
      knees[i],
      feet[i],
      (coat ? 4 : 5) * scale,
      12 + i * 50,
      o,
    );
    const f = feet[i];
    pen(
      g,
      [
        [f[0] - 4, f[1] - 3],
        [f[0] + 5, f[1] - 2],
        [f[0] + 10, f[1] + 1],
        [f[0] + 9, f[1] + 3],
        [f[0] - 6, f[1] + 3],
        [f[0] - 4, f[1] - 3],
      ],
      { ...o, seed: 90 + i, close: true, fill: "#e8e1d3" },
    );
    pen(
      g,
      [
        [f[0] - 4, f[1] + 1],
        [f[0] + 7, f[1] + 2],
      ],
      { ...o, width: 0.45 },
    );
  }
  const body = [
    [s[0] - 9 * scale, s[1]],
    [s[0] + 6 * scale, s[1] - 2],
    [s[0] + 12 * scale, s[1] + 9 * scale],
    [h[0] + 9 * scale, h[1] + (coat ? 18 : 3) * scale],
    [h[0] - 10 * scale, h[1] + (coat ? 17 : 2) * scale],
    [s[0] - 12 * scale, s[1] + 14 * scale],
  ];
  pen(g, body, { ...o, seed: 111, close: true, fill: "#f1ebde" });
  pen(
    g,
    [
      [s[0] - 4, s[1] + 2],
      [s[0] + 1, s[1] + 12],
      [h[0] + 1, h[1] + 8],
      [h[0] + 7, h[1] + (coat ? 15 : 2)],
    ],
    { ...o, seed: 114 },
  );
  pen(
    g,
    [
      [s[0] + 3, s[1] + 3],
      [s[0] - 1, s[1] + 14],
      [s[0] - 7, s[1] + 8],
    ],
    { ...o, width: 0.45 },
  );
  for (let i = 0; i < 12; i++) {
    const t = i / 12,
      v = lerp(s, h, t),
      r = hash(i + 5);
    pen(
      g,
      [
        [v[0] - 8 + r * 5, v[1] + 4],
        [v[0] + 6 - r * 4, v[1] + 8 + hash(i) * 5],
      ],
      {
        ...o,
        seed: 120 + i,
        width: o.width * (0.35 + hash(i) * 0.25),
        opacity: 0.35 + hash(i + 8) * 0.3,
      },
    );
  }
  if (apron)
    pen(
      g,
      [
        [s[0] - 5, s[1] + 11],
        [s[0] + 5, s[1] + 12],
        [h[0] + 12, h[1] + 14],
        [h[0] - 9, h[1] + 16],
        [s[0] - 5, s[1] + 11],
      ],
      { ...o, seed: 142 },
    );
  // Asymmetric neck, angular face, loose hair, and a small ear: no circular stick-figure head.
  const hx = head[0],
    hy = head[1],
    k = scale * (coat ? 1.08 : apron ? 0.92 : 1);
  pen(
    g,
    [
      [n[0] - 4, n[1] + 8],
      [hx - 5 * k, hy + 9 * k],
      [hx + 3 * k, hy + 13 * k],
      [n[0] + 4, n[1] + 9],
    ],
    { ...o, seed: 150 },
  );
  pen(
    g,
    [
      [hx - 7 * k, hy + 3 * k],
      [hx - 8 * k, hy - 7 * k],
      [hx - 3 * k, hy - 12 * k],
      [hx + 5 * k, hy - 11 * k],
      [hx + 9 * k, hy - 5 * k],
      [hx + 8 * k, hy + 1 * k],
      [hx + 12 * k, hy + 5 * k],
      [hx + 7 * k, hy + 6 * k],
      [hx + 6 * k, hy + 11 * k],
      [hx, hy + 13 * k],
      [hx - 6 * k, hy + 9 * k],
    ],
    { ...o, seed: 152, close: true, fill: "#f1ebde" },
  );
  pen(
    g,
    [
      [hx + 4 * k, hy + 1 * k],
      [hx + 7 * k, hy],
    ],
    { ...o, seed: 157, width: o.width * 0.65 },
  );
  pen(
    g,
    [
      [hx + 3 * k, hy + 8 * k],
      [hx + 7 * k, hy + 8 * k],
    ],
    { ...o, width: o.width * 0.5 },
  );
  pen(
    g,
    [
      [hx - 5 * k, hy + 1 * k],
      [hx - 7 * k, hy + 4 * k],
      [hx - 4 * k, hy + 6 * k],
    ],
    { ...o, width: o.width * 0.5 },
  );
  for (let i = 0; i < 7; i++)
    pen(
      g,
      [
        [hx - 9 * k + i * 2 * k, hy - 3 * k],
        [hx - 8 * k + i * k, hy - 12 * k],
        [hx + 2 * k + i * k, hy - 12 * k],
      ],
      { ...o, seed: 160 + i, width: o.width * 0.6, opacity: 0.65 },
    );
  for (let i = 0; i < 2; i++) {
    limb(
      g,
      [s[0] + (i ? 4 : -3) * scale, s[1] + 3 * scale],
      elbows[i],
      hands[i],
      3.5 * scale,
      185 + i * 31,
      o,
    );
    const hand = hands[i];
    pen(
      g,
      [
        [hand[0] - 3, hand[1] - 3],
        [hand[0] + 2, hand[1] - 4],
        [hand[0] + 5, hand[1]],
        [hand[0] + 3, hand[1] + 4],
        [hand[0] - 3, hand[1] + 2],
        [hand[0] - 3, hand[1] - 3],
      ],
      {
        ...o,
        seed: 222 + i,
        fill: "#f1ebde",
        close: true,
        width: o.width * 0.65,
      },
    );
    for (let j = 0; j < 3; j++)
      pen(
        g,
        [
          [hand[0] + j - 1, hand[1] - 2],
          [hand[0] + j, hand[1] + 2],
        ],
        { ...o, width: o.width * 0.4 },
      );
  }
  if (state.tool?.kind === "hammer") {
    const { grip, head, angle } = state.tool,
      norm = [-Math.sin(angle), Math.cos(angle)];
    pen(g, [grip, head], { ...o, rough: 0, width: 2.4 });
    pen(
      g,
      [
        [head[0] - norm[0] * 7, head[1] - norm[1] * 7],
        [head[0] + norm[0] * 7, head[1] + norm[1] * 7],
      ],
      { ...o, rough: 0, width: 4 },
    );
  }
  if (state.tool?.kind === "pencil")
    pen(g, [state.tool.grip, state.tool.head], { ...o, rough: 0, width: 1.5 });
  return g;
}
function beam(g, x, y, w, ink = 0.9) {
  pen(
    g,
    [
      [x, y],
      [x + w, y - 1],
      [x + w + 1, y + 9],
      [x - 1, y + 9],
      [x, y],
    ],
    { seed: 71, width: ink, fill: "#e8e1d2" },
  );
  pen(
    g,
    [
      [x + 4, y + 3],
      [x + w - 4, y + 4],
    ],
    { seed: 73, width: 0.35, opacity: 0.6 },
  );
  for (let i = 6; i < w; i += 14)
    pen(
      g,
      [
        [x + i, y + 8],
        [x + i + 7, y + 2],
      ],
      { seed: i, width: 0.35, opacity: 0.35 },
    );
}
export function architecture(parent) {
  const g = node("g");
  parent.append(g);
  for (const [x, w, h] of [
    [15, 65, 100],
    [80, 112, 145],
    [192, 53, 86],
  ]) {
    pen(
      g,
      [
        [x, 190],
        [x, 190 - h],
        [x + w / 2, 178 - h],
        [x + w, 190 - h],
        [x + w, 190],
      ],
      { rough: 0.65, width: 0.7 },
    );
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const xx = x + 8 + (col * (w - 17)) / 3,
          yy = 200 - h + row * 28;
        pen(
          g,
          [
            [xx, yy + 17],
            [xx, yy],
            [xx + 9, yy],
            [xx + 9, yy + 17],
            [xx, yy + 17],
          ],
          { seed: row * 8 + col, rough: 0.55, width: 0.45 },
        );
      }
  }
  for (let i = 0; i < 25; i++)
    pen(
      g,
      [
        [5 + i * 10, 202],
        [28 + i * 10, 195],
      ],
      { seed: i, width: 0.4, opacity: 0.35 },
    );
  return g;
}
export function scene(svg, state, settings) {
  svg.replaceChildren();
  svg.style.color = settings.ink;
  const all = node("g", {
    transform: settings.side === "right" ? "translate(760 0) scale(-1 1)" : "",
    fill: "none",
  });
  svg.append(all);
  const back = node("g", { opacity: 0.6 });
  all.append(back);
  pen(
    back,
    [
      [65, 327],
      [695, 327],
    ],
    { seed: 2, width: 0.5, opacity: 0.6 },
  );
  pen(
    back,
    [
      [65, 331],
      [695, 329],
    ],
    { seed: 5, width: 0.3, opacity: 0.35 },
  );
  for (let i = 0; i < 40; i++)
    pen(
      back,
      [
        [67 + i * 15, 330],
        [75 + i * 15, 326],
      ],
      { seed: i, width: 0.4, opacity: 0.3 },
    );
  if (state.activity === "hammer") {
    for (let i = 0; i < 5; i++) {
      const x = 144 + i * 92;
      if (i < state.output.completed) beam(all, x, 296, 90);
      else
        pen(
          back,
          [
            [x, 296],
            [x + 90, 296],
            [x + 90, 305],
          ],
          { width: 0.45, dash: "2 5" },
        );
      const nail = state.output.nails[i],
        y = 296 - (1 - nail.depth) * 11;
      pen(
        all,
        [
          [nail.x, y],
          [nail.x, 300],
        ],
        { rough: 0, width: 0.8 },
      );
      pen(
        all,
        [
          [nail.x - 2, y],
          [nail.x + 2, y],
        ],
        { rough: 0, width: 1 },
      );
    }
    if (state.impact)
      for (let i = 0; i < 3; i++)
        pen(
          back,
          [
            [state.nail[0] + 8 + i * 5, 288 - i * 3],
            [state.nail[0] + 11 + i * 5, 284 - i * 3],
          ],
          { width: 0.5 },
        );
  } else if (state.activity === "ladder") {
    pen(
      all,
      [
        [131, 329],
        [131, 32],
        [136, 32],
        [136, 329],
      ],
      { width: 0.85 },
    );
    pen(
      all,
      [
        [185, 329],
        [185, 32],
        [190, 32],
        [190, 329],
      ],
      { width: 0.85 },
    );
    for (let y = 23; y <= 309; y += 22) {
      pen(
        all,
        [
          [133, y],
          [189, y],
        ],
        { width: 0.7 },
      );
      pen(
        back,
        [
          [133, y + 3],
          [189, y + 3],
        ],
        { width: 0.4 },
      );
    }
    pen(
      back,
      [
        [113, 32],
        [209, 32],
        [209, 8],
      ],
      { width: 0.45, dash: "3 4" },
    );
  } else if (state.activity === "rope") {
    // A fixed overhead pair: one growing tail, one shrinking load leg, constant total rope length.
    pen(
      back,
      [
        [110, 35],
        [565, 35],
      ],
      { width: 0.7 },
    );
    for (const x of [207, 480]) {
      pen(
        all,
        [
          [x, 35],
          [x, 44],
        ],
        { width: 1 },
      );
      const g = node("g", {
        transform: `translate(${x} 66) rotate(${(state.output.ropeAngle * 180) / Math.PI})`,
      });
      all.append(g);
      for (const r of [21, 17, 3])
        g.append(
          node("circle", { r, stroke: "currentColor", "stroke-width": 0.7 }),
        );
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        pen(
          g,
          [
            [Math.cos(a) * 4, Math.sin(a) * 4],
            [Math.cos(a) * 17, Math.sin(a) * 17],
          ],
          { width: 0.45 },
        );
      }
    }
    pen(
      all,
      [
        [185, 170 + state.output.pull],
        [185, 66],
        [187, 55],
        [196, 46],
        [207, 44],
        [480, 44],
        [491, 47],
        [500, 56],
        [502, 66],
        [502, state.output.objectY + 16],
      ],
      { rough: 0.2, width: 0.8 },
    );
    pen(
      all,
      [
        [491, state.output.objectY + 16],
        [513, state.output.objectY + 16],
      ],
      { width: 0.8 },
    );
    pen(
      back,
      [
        [197, 90],
        [202, 94],
        [209, 85],
      ],
      { width: 0.6 },
    );
  } else if (state.activity === "paint") {
    for (const [i, points] of inkStrokes(WALL_PATH).entries())
      pen(back, points, {
        width: 0.4,
        opacity: 0.35,
        dash: "2 4",
        seed: 17 + i,
      });
    for (const [i, points] of state.output.strokes.entries())
      if (points.length > 1)
        pen(all, points, {
          width: settings.stroke,
          rough: settings.irregularity,
          seed: 17 + i,
        });
    const footY = Math.max(...state.pose.feet.map((f) => f[1])) + 5,
      x = state.pose.hip[0];
    pen(
      back,
      [
        [x - 33, footY],
        [x + 34, footY],
        [x + 34, footY + 5],
        [x - 33, footY + 5],
      ],
      { width: 0.65 },
    );
    pen(
      back,
      [
        [x - 24, footY + 5],
        [x - 24, 400],
        [x + 22, 400],
        [x + 22, footY + 5],
      ],
      { width: 0.4, dash: "2 3" },
    );
  } else {
    for (const x of [350, 474]) {
      pen(
        back,
        [
          [x, 330],
          [x, 205],
          [x + 5, 205],
          [x + 5, 330],
        ],
        { width: 0.7 },
      );
    }
    for (let i = 0; i < state.output.completed; i++)
      beam(all, 342, 288 - i * 32, 144);
    if (state.tool && state.output.completed < 3)
      beam(all, state.tool.x, state.tool.y, state.tool.width);
  }
  character(all, state, settings);
  // Small interrupted graphite shadows, always seeded and tied to the pose.
  const x = state.pose.hip[0],
    y = Math.max(...state.pose.feet.map((f) => f[1])) + 5;
  for (let i = 0; i < 6; i++)
    pen(
      all,
      [
        [x - 25 + i * 5, y + hash(i) * 3],
        [x - 6 + i * 7, y + 2 + hash(i + 5) * 3],
      ],
      { width: 0.4, opacity: 0.18, seed: i },
    );
  svg.dataset.progress = String(state.progress);
  svg.dataset.activity = state.activity;
  return all;
}
