export const DEFAULTS = Object.freeze({
  mode: "dial",
  lineWidth: 1.8,
  sensitivity: 1,
  boardSize: "classic",
  stylus: "soft",
  knobSpeed: 1,
  eraseBehavior: "animated",
  replaySpeed: 1,
  frameStyle: "original",
  stampSize: 70,
});
export const PRESETS = {
  classic: { name: "Cherry & silver", settings: { ...DEFAULTS } },
  magnetic: {
    name: "Porcelain & sea glass",
    settings: {
      ...DEFAULTS,
      mode: "magnetic",
      lineWidth: 4.2,
      frameStyle: "original",
    },
  },
  night: {
    name: "Midnight drafting",
    settings: { ...DEFAULTS, frameStyle: "graphite", lineWidth: 1.2 },
  },
  seaside: {
    name: "Seaside postcard",
    settings: {
      ...DEFAULTS,
      mode: "magnetic",
      frameStyle: "seafoam",
      boardSize: "wide",
      lineWidth: 3.4,
    },
  },
};
export const LIMIT = 16000;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ranges = {
  lineWidth: [0.7, 10],
  sensitivity: [0.3, 2.5],
  knobSpeed: [0.25, 3],
  replaySpeed: [0.25, 3],
  stampSize: [30, 140],
};
const choices = {
  mode: ["dial", "magnetic"],
  boardSize: ["classic", "wide", "square"],
  stylus: ["soft", "fine", "eraser"],
  eraseBehavior: ["animated", "instant"],
  frameStyle: ["original", "seafoam", "graphite"],
};
export function options(value = {}) {
  const out = { ...DEFAULTS };
  for (const [k, [a, b]] of Object.entries(ranges))
    if (Number.isFinite(+value[k])) out[k] = clamp(+value[k], a, b);
  for (const [k, list] of Object.entries(choices))
    if (list.includes(value[k])) out[k] = value[k];
  return out;
}
export function boardHeight(size) {
  return { classic: 680, wide: 550, square: 900 }[size] || 680;
}
export function point(p) {
  return [clamp(p[0], 0, 1), clamp(p[1], 0, 1)];
}
export function angleDelta(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}
export function cost(e) {
  return e.kind === "line"
    ? Math.max(0.0015, Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]))
    : e.kind === "wipe"
      ? Math.max(0.003, Math.abs(e.b - e.a))
      : 0.055;
}
export function createDrawing(mode = "dial") {
  let events = [],
    cursor = [0.16, 0.67],
    epoch = 0,
    total = 0,
    prefix = [],
    undo = [],
    redo = [],
    before = null;
  const snapshot = () => ({ events: events.slice(), cursor: [...cursor] });
  function restore(s) {
    events = s.events.slice();
    cursor = [...s.cursor];
    epoch++;
    prefix = [];
    total = 0;
    for (const e of events) {
      total += cost(e);
      prefix.push(total);
    }
  }
  function push(e) {
    if (events.length >= LIMIT) return false;
    events.push(e);
    total += cost(e);
    prefix.push(total);
    return true;
  }
  function begin() {
    if (!before) before = snapshot();
  }
  function commit() {
    if (!before) return;
    if (
      before.events.length !== events.length ||
      (before.events !== events &&
        before.events.some((e, i) => e !== events[i]))
    ) {
      undo.push(before);
      if (undo.length > 24) undo.shift();
      redo = [];
    }
    before = null;
  }
  function move(dx, dy, width = 1.8) {
    const next = point([cursor[0] + dx, cursor[1] + dy]);
    if (Math.hypot(next[0] - cursor[0], next[1] - cursor[1]) < 1e-7)
      return false;
    if (!push({ kind: "line", a: [...cursor], b: next, width, tool: "ink" }))
      return false;
    cursor = next;
    return true;
  }
  function stroke(a, b, width = 4, tool = "soft") {
    if (mode === "dial") return move(b[0] - cursor[0], b[1] - cursor[1], width);
    if (!push({ kind: "line", a: point(a), b: point(b), width, tool }))
      return false;
    cursor = point(b);
    return true;
  }
  function stamp(shape, p, size = 70) {
    if (mode !== "magnetic") return false;
    return push({ kind: "stamp", shape, p: point(p), size });
  }
  function wipe(a, b) {
    if (mode !== "magnetic") return false;
    return push({ kind: "wipe", a: clamp(a, 0, 1), b: clamp(b, 0, 1) });
  }
  return {
    begin,
    commit,
    move,
    stroke,
    stamp,
    wipe,
    clear() {
      begin();
      restore({ events: [], cursor: [0.16, 0.67] });
      commit();
    },
    undo() {
      commit();
      if (!undo.length) return false;
      redo.push(snapshot());
      restore(undo.pop());
      return true;
    },
    redo() {
      commit();
      if (!redo.length) return false;
      undo.push(snapshot());
      restore(redo.pop());
      return true;
    },
    cancel() {
      if (before) {
        restore(before);
        before = null;
      }
    },
    load(doc) {
      begin();
      restore(doc);
      commit();
    },
    state: () => ({
      mode,
      events,
      cursor: [...cursor],
      epoch,
      prefix,
      total,
      undo: undo.length,
      redo: redo.length,
    }),
    serialize: () => ({ version: 1, kind: "drawing-toy", mode, ...snapshot() }),
    dispose() {
      events = [];
      prefix = [];
      undo = [];
      redo = [];
      before = null;
    },
  };
}
function validPoint(p) {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    p.every(
      (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1,
    )
  );
}
export function readDrawing(value) {
  if (
    !value ||
    value.version !== 1 ||
    value.kind !== "drawing-toy" ||
    !["dial", "magnetic"].includes(value.mode) ||
    !Array.isArray(value.events) ||
    value.events.length > LIMIT ||
    !validPoint(value.cursor)
  )
    throw Error(
      "Choose a version 1 drawing-toy JSON with normalized coordinates.",
    );
  let prior = null;
  const events = value.events.map((e) => {
    if (
      e.kind === "line" &&
      validPoint(e.a) &&
      validPoint(e.b) &&
      Number.isFinite(e.width) &&
      e.width >= 0.5 &&
      e.width <= 30 &&
      ["ink", "soft", "fine", "eraser"].includes(e.tool)
    ) {
      if (
        value.mode === "dial" &&
        (e.tool !== "ink" ||
          (prior && Math.hypot(e.a[0] - prior[0], e.a[1] - prior[1]) > 1e-6))
      )
        throw Error("Twin-dial drawings must be one continuous ink line.");
      prior = e.b;
      return {
        kind: "line",
        a: [...e.a],
        b: [...e.b],
        width: e.width,
        tool: e.tool,
      };
    }
    if (
      value.mode === "magnetic" &&
      e.kind === "stamp" &&
      ["star", "circle", "square"].includes(e.shape) &&
      validPoint(e.p) &&
      Number.isFinite(e.size) &&
      e.size >= 20 &&
      e.size <= 160
    )
      return { kind: "stamp", shape: e.shape, p: [...e.p], size: e.size };
    if (
      value.mode === "magnetic" &&
      e.kind === "wipe" &&
      Number.isFinite(e.a) &&
      Number.isFinite(e.b) &&
      e.a >= 0 &&
      e.a <= 1 &&
      e.b >= 0 &&
      e.b <= 1
    )
      return { kind: "wipe", a: e.a, b: e.b };
    throw Error("The drawing contains an invalid mark.");
  });
  if (
    value.mode === "dial" &&
    prior &&
    Math.hypot(prior[0] - value.cursor[0], prior[1] - value.cursor[1]) > 1e-6
  )
    throw Error("The drawing head must meet the continuous line.");
  return {
    version: 1,
    kind: "drawing-toy",
    mode: value.mode,
    events,
    cursor: [...value.cursor],
  };
}
export function pathDocument(input, mode = "dial", width = 1.8) {
  const points = Array.isArray(input) ? input : input?.points;
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    points.length > 8000 ||
    !points.every(validPoint)
  )
    throw Error("A path needs 2–8,000 [x,y] points between 0 and 1.");
  return {
    version: 1,
    kind: "drawing-toy",
    mode,
    events: points
      .slice(1)
      .map((p, i) => ({
        kind: "line",
        a: [...points[i]],
        b: [...p],
        width,
        tool: mode === "dial" ? "ink" : "soft",
      })),
    cursor: [...points.at(-1)],
  };
}
export function replayPosition(state, progress = 1) {
  const distance = state.total * clamp(progress, 0, 1);
  let lo = 0,
    hi = state.prefix.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (state.prefix[mid] <= distance) lo = mid + 1;
    else hi = mid;
  }
  const previous = lo ? state.prefix[lo - 1] : 0;
  return {
    index: lo,
    fraction:
      lo < state.events.length
        ? (distance - previous) / cost(state.events[lo])
        : 0,
  };
}
