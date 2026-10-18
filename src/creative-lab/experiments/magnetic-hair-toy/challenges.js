import { clamp } from "./model.js";
export const PATTERNS = {
  handlebar: {
    name: "The magnificent moustache",
    instruction:
      "Gather a pinch from the tray. Sweep it across the upper lip, then curl the ends.",
  },
  brows: {
    name: "Two very expressive eyebrows",
    instruction:
      "Make a pair of sweeping brows above the eyes. Lift the magnet between them.",
  },
  beard: {
    name: "A distinguished little beard",
    instruction:
      "Follow the jaw with a loose necklace of filings. Leave the mouth clear.",
  },
  crown: {
    name: "The electric crown",
    instruction:
      "Pile up a tall, zigzagging hairdo. The sky is the limit (the glass is not).",
  },
  antennae: {
    name: "Reception from another planet",
    instruction: "Two unlikely antennae. A face with excellent reception.",
  },
  spiral: {
    name: "The thinking curl",
    instruction:
      "Make a spiral above the forehead. A truly circular train of thought.",
  },
};
export function patternPaths(kind, face = "milo") {
  const offset = face === "cosmo" ? -10 : face === "cleo" ? 5 : 0,
    sy = (y) => y + offset;
  const arc = (x, y, rx, ry, a, b, n = 40) =>
    Array.from({ length: n }, (_, i) => {
      const t = a + ((b - a) * i) / (n - 1);
      return [x + Math.cos(t) * rx, sy(y + Math.sin(t) * ry)];
    });
  switch (kind) {
    case "brows":
      return [
        arc(379, 276, 47, 13, Math.PI * 1.05, Math.PI * 1.95, 24),
        arc(521, 276, 47, 13, Math.PI * 1.05, Math.PI * 1.95, 24),
      ];
    case "beard":
      return [
        arc(450, 398, 112, 88, 0.1, Math.PI - 0.1, 48),
        arc(450, 413, 76, 62, 0.1, Math.PI - 0.1, 40),
      ];
    case "crown":
      return [
        [
          [326, 234],
          [333, 159],
          [377, 197],
          [401, 121],
          [437, 176],
          [476, 112],
          [498, 180],
          [552, 147],
          [568, 235],
        ],
      ];
    case "antennae":
      return [
        [
          [379, 235],
          [348, 180],
          [343, 121],
        ],
        [
          [520, 232],
          [554, 180],
          [569, 124],
        ],
        arc(343, 109, 17, 17, 0, Math.PI * 2, 24),
        arc(569, 110, 17, 17, 0, Math.PI * 2, 24),
      ];
    case "spiral":
      return [
        Array.from({ length: 90 }, (_, i) => {
          const t = (i / 89) * Math.PI * 3.6,
            r = 8 + i * 0.65;
          return [450 + Math.cos(t) * r, sy(175 + Math.sin(t) * r)];
        }),
      ];
    default:
      return [
        [
          [450, 380],
          [424, 373],
          [397, 383],
          [367, 393],
          [344, 382],
          [342, 365],
        ],
        [
          [450, 380],
          [477, 373],
          [504, 383],
          [533, 393],
          [556, 382],
          [558, 365],
        ],
      ].map((path) => path.map(([x, y]) => [x, sy(y)]));
  }
}
export function patternSamples(kind, face) {
  const points = [];
  for (const path of patternPaths(kind, face)) {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i],
        d = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.max(1, Math.ceil(d / 12));
      for (let k = 0; k < n; k++)
        points.push([
          a[0] + ((b[0] - a[0]) * k) / n,
          a[1] + ((b[1] - a[1]) * k) / n,
        ]);
    }
    points.push(path.at(-1));
  }
  return points;
}
export function scorePattern(field, kind, face) {
  const points = patternSamples(kind, face),
    counts = new Uint16Array(points.length);
  let placed = 0,
    matched = 0;
  for (let i = 0; i < field.count; i++) {
    if (field.y[i] > 600) continue;
    placed++;
    let best = Infinity,
      index = 0;
    for (let j = 0; j < points.length; j++) {
      const dx = field.x[i] - points[j][0],
        dy = field.y[i] - points[j][1],
        d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        index = j;
      }
    }
    if (best < 26 * 26) {
      matched++;
      counts[index]++;
    }
  }
  const desired = Math.max(3, field.count / 850),
    coverage =
      counts.reduce((s, n) => s + Math.min(1, n / desired), 0) / points.length,
    precision = placed ? matched / placed : 0;
  return {
    score: Math.round(
      100 *
        (coverage && precision
          ? (2 * coverage * precision) / (coverage + precision)
          : 0),
    ),
    coverage: Math.round(coverage * 100),
    precision: Math.round(precision * 100),
    placed,
    matched,
  };
}
export function createChallenge() {
  let status = "ready",
    remaining = 45,
    elapsed = 0,
    result = 0;
  return {
    state: () => ({ status, remaining, elapsed, result }),
    start(seconds) {
      remaining = seconds;
      elapsed = 0;
      result = 0;
      status = "playing";
    },
    tick(dt, score) {
      if (status !== "playing") return;
      const delta = clamp(dt, 0, 0.25);
      elapsed += delta;
      remaining = Math.max(0, remaining - delta);
      result = score;
      if (remaining === 0) status = "finished";
    },
    finish(score) {
      if (status === "playing") {
        result = score;
        status = "finished";
      }
    },
    reset() {
      status = "ready";
      remaining = 45;
      elapsed = 0;
      result = 0;
    },
  };
}
