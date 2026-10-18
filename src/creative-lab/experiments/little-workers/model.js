/** Pure, seekable job tracks. Coordinates are shared by the figure and its output. */
export const ACTIVITIES = ["hammer", "ladder", "rope", "paint", "carry"];
export const DEFAULTS = {
  character: "crew",
  size: 1,
  activity: "team",
  irregularity: 0.7,
  ink: "#37342e",
  stroke: 0.8,
  progress: 0,
  distance: 2400,
  speed: 1,
  side: "left",
};
export const PRESETS = {
  notebook: { name: "The working notebook", settings: DEFAULTS },
  graphite: {
    name: "Graphite studies",
    settings: {
      ...DEFAULTS,
      character: "coat",
      stroke: 0.6,
      irregularity: 0.95,
      ink: "#59564f",
    },
  },
  red: {
    name: "An editor’s red pencil",
    settings: { ...DEFAULTS, character: "apron", ink: "#8b483c", stroke: 0.75 },
  },
  fine: {
    name: "A fine steel nib",
    settings: { ...DEFAULTS, irregularity: 0.25, stroke: 0.55, size: 1.12 },
  },
};
export const clamp = (n, a = 0, b = 1) =>
  Math.max(a, Math.min(b, Number.isFinite(+n) ? +n : a));
export const mix = (a, b, t) => a + (b - a) * t;
export const ease = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
export function options(input = {}) {
  const o = { ...DEFAULTS };
  for (const key of [
    "size",
    "irregularity",
    "stroke",
    "progress",
    "distance",
    "speed",
  ]) {
    const bounds = {
      size: [0.75, 1.25],
      irregularity: [0, 1],
      stroke: [0.35, 1.4],
      progress: [0, 100],
      distance: [1200, 5000],
      speed: [0.5, 2],
    }[key];
    o[key] = clamp(input[key] ?? o[key], ...bounds);
  }
  for (const [key, values] of Object.entries({
    character: ["crew", "draughtsman", "coat", "apron"],
    activity: ["team", ...ACTIVITIES],
    side: ["left", "right"],
  }))
    if (values.includes(input[key])) o[key] = input[key];
  if (/^#[a-f\d]{6}$/i.test(input.ink || "")) o.ink = input.ink;
  return o;
}
/** A two-bone chain that preserves the supplied end contact exactly. */
export function joint(a, b, lengthA = 24, lengthB = 25, bend = 1) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    d = Math.hypot(dx, dy) || 0.001,
    r = Math.max(1, d / (lengthA + lengthB - 0.01));
  lengthA *= r;
  lengthB *= r;
  const along = clamp(
      (lengthA * lengthA - lengthB * lengthB + d * d) / (2 * d),
      0,
      d,
    ),
    h = Math.sqrt(Math.max(0, lengthA * lengthA - along * along));
  return [
    a[0] + (dx / d) * along - (dy / d) * h * bend,
    a[1] + (dy / d) * along + (dx / d) * h * bend,
  ];
}
function skeleton(hip, shoulder, hands, feet, size = 1) {
  const neck = [shoulder[0] + 3 * size, shoulder[1] - 6 * size];
  return {
    hip,
    shoulder,
    neck,
    head: [neck[0] + 2 * size, neck[1] - 13 * size],
    hands,
    feet,
    elbows: hands.map((h, i) =>
      joint(
        [shoulder[0] + (i ? 4 : -3) * size, shoulder[1] + 3 * size],
        h,
        25 * size,
        24 * size,
        i ? -1 : 1,
      ),
    ),
    knees: feet.map((f, i) =>
      joint(
        [hip[0] + (i ? 4 : -3) * size, hip[1]],
        f,
        28 * size,
        28 * size,
        i ? 1 : -1,
      ),
    ),
  };
}
export const WALL_PATH = [
  [205, 295],
  [205, 167],
  [275, 112],
  [345, 167],
  [345, 295],
  [205, 295],
  [345, 295],
  [345, 207],
  [385, 176],
  [425, 207],
  [425, 295],
  [345, 295],
  [425, 295],
  [425, 139],
  [469, 101],
  [514, 139],
  [514, 295],
  [425, 295],
  [238, 264],
  [238, 205],
  [262, 205],
  [262, 264],
  [238, 264],
  [288, 264],
  [288, 205],
  [312, 205],
  [312, 264],
  [288, 264],
  [449, 180],
  [490, 180],
  [490, 239],
  [449, 239],
  [449, 180],
  [225, 167],
  [324, 167],
  [275, 127],
  [225, 167],
];
export const WALL_BREAKS = new Set([18, 23, 28, 33]);
export function inkStrokes(points) {
  const strokes = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || WALL_BREAKS.has(i)) strokes.push([]);
    strokes.at(-1).push(points[i]);
  }
  return strokes;
}
export function trace(path, progress) {
  const lengths = path
      .slice(1)
      .map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1])),
    total = lengths.reduce((a, b) => a + b, 0);
  let remaining = clamp(progress) * total,
    points = [path[0]];
  for (let i = 0; i < lengths.length; i++) {
    if (remaining >= lengths[i]) {
      points.push(path[i + 1]);
      remaining -= lengths[i];
    } else {
      points.push(lerp(path[i], path[i + 1], remaining / lengths[i]));
      break;
    }
  }
  return { points, tip: points.at(-1), length: clamp(progress) * total, total };
}
export function evaluate(activity, progress, config = {}) {
  if (!ACTIVITIES.includes(activity))
    throw new TypeError("Unknown worker activity");
  const settings = options(config),
    p = clamp(progress),
    s = settings.size;
  let hip,
    shoulder,
    hands,
    feet,
    tool = null,
    output = {},
    extras = {};
  if (activity === "hammer") {
    const count = 5,
      q = p * count,
      n = Math.min(count - 1, Math.floor(q)),
      f = q - n,
      move = ease((f - 0.82) / 0.18),
      nail = [190 + 92 * n, 296],
      next = [190 + 92 * Math.min(n + 1, 4), 296],
      anchor = lerp(nail, next, move);
    hip = [anchor[0] - 53, 278];
    shoulder = [hip[0] + 13, hip[1] - 39 * s];
    feet = [
      [hip[0] - 21, 294],
      [hip[0] + 20, 295],
    ];
    const pivot = [nail[0] - 28, 258],
      angle = mix(-2.1, Math.atan2(38, 28), ease((f - 0.2) / 0.4)),
      radius = Math.hypot(28, 38);
    let head = [
      pivot[0] + Math.cos(angle) * radius,
      pivot[1] + Math.sin(angle) * radius,
    ];
    if (f > 0.8) head = lerp(nail, [next[0] - 52, 217], ease((f - 0.8) / 0.2));
    const grip = [
      head[0] - Math.cos(angle) * 24,
      head[1] - Math.sin(angle) * 24,
    ];
    hands = [[hip[0] + 25, 286], grip];
    tool = { kind: "hammer", head, grip, angle };
    const completed = n + (f >= 0.6 - 1e-9 ? 1 : 0);
    output = {
      completed,
      divider: completed / count,
      nails: Array.from({ length: count }, (_, i) => ({
        x: 190 + 92 * i,
        y: 296,
        depth: clamp((q - i - 0.52) / 0.08),
      })),
    };
    extras = { impact: f >= 0.6 - 1e-9 && f < 0.8, nail };
  } else if (activity === "ladder") {
    const q = p * 8,
      n = Math.min(7, Math.floor(q)),
      f = q - n,
      step = 22,
      base = 309;
    const contact = (index, hand) => {
      const advances = Math.floor(n / 2) + (n % 2 > index ? 1 : 0),
        from = base - (advances * 2 + (hand ? 4 : 0)) * step;
      let to = from;
      if (n % 2 === index) to = from - 2 * step;
      const travel = ease(f);
      return [
        hand ? 157 + (index ? 20 : -11) : 151 + (index ? 20 : -9),
        mix(from, to, travel),
      ];
    };
    feet = [contact(0, false), contact(1, false)];
    hands = [contact(0, true), contact(1, true)];
    hip = [145, base - 45 - q * step];
    shoulder = [151, hip[1] - 39 * s];
    output = { reveal: p, rung: Math.floor(q) };
    extras = { planted: n % 2 === 0 ? 1 : 0, rungSpacing: step };
  } else if (activity === "rope") {
    const pull = p * 146,
      cycle = p * 4,
      n = Math.min(3, Math.floor(cycle)),
      f = cycle - n,
      phase = ease(f);
    hip = [157, 271 + 4 * Math.sin(p * Math.PI * 8)];
    shoulder = [148, hip[1] - 42 * s];
    feet = [
      [133, 324],
      [177, 323],
    ];
    hands = [
      [185, 185 + phase * 36.5],
      [185, 214 + phase * 36.5],
    ];
    output = { lift: pull, objectY: 245 - pull, ropeAngle: pull / 22, pull };
    extras = { ropeX: 185, pulley: [292, 66], returning: f > 0.82 };
    // Hand-over-hand release is confined to the last part of each stroke; the load stays held.
    const travel = f < 0.82 ? ease(f / 0.82) : 1;
    output.pull = (n + travel) * 36.5;
    output.lift = output.pull;
    output.objectY = 245 - output.lift;
    output.ropeAngle = output.pull / 22;
    hands = [
      [185, mix(185 + travel * 36.5, 185, ease((f - 0.82) / 0.18))],
      [185, mix(216 + travel * 36.5, 216, ease((f - 0.82) / 0.18))],
    ];
  } else if (activity === "paint") {
    const line = trace(WALL_PATH, p),
      tip = line.tip;
    hip = [tip[0] - 43, tip[1] + 28];
    shoulder = [hip[0] + 9, hip[1] - 40 * s];
    feet = [
      [hip[0] - 18, hip[1] + 48 * s],
      [hip[0] + 16, hip[1] + 49 * s],
    ];
    hands = [
      [hip[0] - 13, hip[1] - 9],
      [tip[0] - 13, tip[1] + 13],
    ];
    tool = { kind: "pencil", head: tip, grip: hands[1] };
    output = {
      line: line.points,
      strokes: inkStrokes(line.points),
      penDown: !WALL_BREAKS.has(line.points.length - 1),
      tip,
      length: line.length,
      total: line.total,
    };
  } else {
    const n = Math.min(2, Math.floor(p * 3)),
      f = p * 3 - n,
      walk = ease(f / 0.65),
      place = ease((f - 0.65) / 0.2),
      beamX = mix(110, 414, walk),
      beamY = mix(227, 288 - n * 32, place),
      step = f < 0.65 ? Math.sin((f / 0.65) * Math.PI * 6) : 0;
    hip = [beamX, 278 + Math.abs(step) * 2];
    shoulder = [hip[0] + 4, hip[1] - 42 * s];
    feet = [
      [hip[0] - 17 + step * 15, 326 - Math.max(0, step) * 8],
      [hip[0] + 17 - step * 15, 326 - Math.max(0, -step) * 8],
    ];
    hands = [
      [beamX - 26, beamY + 5],
      [beamX + 30, beamY + 5],
    ];
    tool = { kind: "beam", x: beamX - 72, y: beamY, width: 144 };
    output = {
      completed: n + (f === 1 ? 1 : 0),
      beam: tool,
      structure: n + place,
    };
    // Between deposits, dissolve neither worker nor plank: walk back empty-handed.
    if (f > 0.9 && n < 2) {
      const back = ease((f - 0.9) / 0.1);
      hip[0] = mix(414, 110, back);
      shoulder = [hip[0] + 4, hip[1] - 42 * s];
      feet = [
        [hip[0] - 17, 326],
        [hip[0] + 17, 326],
      ];
      hands = [
        [hip[0] - 12, hip[1] - 12],
        [hip[0] + 20, hip[1] - 14],
      ];
      tool = null;
      output.completed = n + 1;
      output.beam = { kind: "beam", x: 342, y: 288 - n * 32, width: 144 };
    }
  }
  return {
    activity,
    progress: p,
    size: s,
    pose: skeleton(hip, shoulder, hands, feet, s),
    tool,
    output,
    ...extras,
  };
}
export function sequenceProgress(progress, index, count = 5, speed = 1) {
  return clamp((clamp(progress) * count - index) * speed);
}
