import {
  options,
  createState,
  makeObjects,
  foldPoint,
  objectPosition,
  clamp,
  validateDocument,
  mod,
} from "./model.js";
import { paintSource } from "./sources.js";
import { renderOptic, discRadius } from "./renderer.js";
/** Portable instrument: Canvas input/output and serializable source state, no site imports. */
export function createKaleidoscope(canvas, initial = {}, hooks = {}) {
  if (!canvas.getContext("2d")) throw Error("Canvas 2D is unavailable.");
  let config = options(initial),
    state = createState(),
    image = null,
    imageData = null,
    disposed = false,
    running = false,
    visible = true,
    raf = 0,
    last = 0,
    frames = 0,
    fps = 0,
    active = null,
    redo = [],
    lastReport = 0;
  const abort = new AbortController(),
    source = document.createElement("canvas"),
    soft = document.createElement("canvas"),
    preview = hooks.sourceCanvas;
  source.width = source.height = 768;
  const on = (el, t, f) => el.addEventListener(t, f, { signal: abort.signal });
  function captureImage(img) {
    // Freeze animated image formats at decode time and bound retained memory.
    const out = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    out.width = Math.max(1, Math.round(img.width * scale));
    out.height = Math.max(1, Math.round(img.height * scale));
    out.getContext("2d").drawImage(img, 0, 0, out.width, out.height);
    return out;
  }
  function info() {
    return {
      config: { ...config },
      frames,
      fps,
      running: running && visible && !document.hidden,
      width: canvas.width,
      height: canvas.height,
      strokes: state.strokes.length,
      points: state.strokes.reduce((n, s) => n + s.points.length, 0),
      time: { ...state.time },
      pan: { ...state.pan },
      seed: state.seed,
      undo: state.strokes.length > 0,
      redo: redo.length > 0,
      primitives: config.mirrors * 2,
      renderer: "Canvas mirrored source chamber",
    };
  }
  function paint() {
    (hooks.drawSource || paintSource)(source, config, state, image);
    if (config.softness > 0) {
      const n = Math.max(48, Math.round(768 / (1 + config.softness * 5)));
      if (soft.width !== n) soft.width = soft.height = n;
      const g = soft.getContext("2d");
      g.clearRect(0, 0, n, n);
      g.drawImage(source, 0, 0, n, n);
    }
  }
  function render(force = true) {
    if (disposed) return;
    const r = canvas.getBoundingClientRect(),
      N = Math.max(
        1,
        Math.min(
          1600,
          Math.round((r.width || 700) * Math.min(devicePixelRatio || 1, 2)),
        ),
      );
    if (canvas.width !== N) canvas.width = canvas.height = N;
    paint();
    renderOptic(canvas, config.softness > 0 ? soft : source, config, state);
    if (preview) {
      const g = preview.getContext("2d");
      g.drawImage(source, 0, 0, preview.width, preview.height);
      g.strokeStyle = "#f4e6bfbb";
      g.lineWidth = 1;
      g.strokeRect(1, 1, preview.width - 2, preview.height - 2);
    }
    frames++;
    const t = performance.now();
    if (force || t - lastReport > 150) {
      lastReport = t;
      hooks.frame?.(info());
    }
  }
  function animated() {
    return config.rotationSpeed !== 0 || config.animationSpeed !== 0;
  }
  function tick(t) {
    raf = 0;
    if (disposed || !running || !visible || document.hidden) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (dt) fps = fps ? Math.round(fps * 0.9 + 0.1 / dt) : Math.round(1 / dt);
    state.time.rotation = mod(
      state.time.rotation + config.rotationSpeed * dt,
      360,
    );
    state.time.source += config.animationSpeed * dt;
    render(false);
    if (animated()) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  function wake() {
    if (
      !disposed &&
      running &&
      visible &&
      !document.hidden &&
      animated() &&
      !raf
    ) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function halt() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function change(values) {
    config = options({ ...config, ...values });
    render();
    wake();
    hooks.change?.({ ...config });
  }
  function finish() {
    if (!active) return;
    try {
      if (active.target.hasPointerCapture(active.id))
        active.target.releasePointerCapture(active.id);
    } catch {}
    active = null;
    render();
  }
  function coordinate(e, target) {
    const r = target.getBoundingClientRect(),
      scale = target === canvas ? discRadius(config) : 0.5;
    return {
      x: (e.clientX - r.left - r.width / 2) / (r.width * scale),
      y: (e.clientY - r.top - r.height / 2) / (r.height * scale),
    };
  }
  function point(e, target) {
    const p = coordinate(e, target);
    return target === canvas
      ? foldPoint(p.x, p.y, config, state.time, state.pan)
      : p;
  }
  function addPoint(p) {
    if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1) return;
    let s = state.strokes.at(-1),
      prev = s?.points.at(-1);
    if (
      !s ||
      !active.stroke ||
      (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > 0.22)
    ) {
      if (state.strokes.length >= 400) return;
      s = { color: config.ink, width: config.brush, points: [] };
      state.strokes.push(s);
      active.stroke = true;
    }
    const count = state.strokes.reduce((n, s) => n + s.points.length, 0);
    if (count >= 60000) return;
    prev = s.points.at(-1);
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.0015)
      s.points.push({ x: p.x, y: p.y });
    redo = [];
  }
  function down(e, target) {
    if (e.button !== 0 || active || config.interaction === "off") return;
    const q = coordinate(e, target);
    if (target === canvas && Math.hypot(q.x, q.y) > 1.12) return;
    e.preventDefault();
    target.focus({ preventScroll: true });
    let p = point(e, target);
    const mode =
      target === canvas && Math.hypot(q.x, q.y) > 1
        ? "rotate"
        : config.source === "drawing"
          ? "draw"
          : target === canvas
            ? config.interaction
            : "object";
    active = {
      id: e.pointerId,
      target,
      mode,
      start: p,
      last: q,
      pan: { ...state.pan },
      stroke: false,
      object: null,
    };
    if (mode === "object") {
      const count =
        config.source === "lines" ? 35 : config.source === "toys" ? 48 : 85;
      const list = state.objects
        .slice(0, count)
        .map((o) => {
          const v = objectPosition(o, state.time.source, config.source);
          return { o, v, d: Math.hypot(v.x - p.x, v.y - p.y) };
        })
        .sort((a, b) => a.d - b.d);
      if (config.source !== "image" && list[0]?.d < 0.28) {
        active.object = list[0].o;
        active.offset = { x: list[0].v.x - p.x, y: list[0].v.y - p.y };
      } else active.mode = "stir";
    }
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}
    if (mode === "draw") addPoint(p);
    render();
    hooks.interact?.(mode);
  }
  function move(e, target) {
    if (!active || active.id !== e.pointerId || active.target !== target)
      return;
    const q = coordinate(e, target),
      p = point(e, target);
    if (active.mode === "rotate") {
      const a = Math.atan2(q.y, q.x),
        b = Math.atan2(active.last.y, active.last.x),
        delta = Math.atan2(Math.sin(a - b), Math.cos(a - b));
      config.rotation = Math.round(
        mod(config.rotation + (delta * 180) / Math.PI, 360),
      );
      hooks.change?.({ ...config });
    } else if (active.mode === "draw") {
      const events = e.getCoalescedEvents?.() || [];
      for (const sample of events) addPoint(point(sample, target));
      addPoint(p);
    } else if (active.object) {
      const o = active.object,
        v = objectPosition(
          { ...o, dx: 0, dy: 0 },
          state.time.source,
          config.source,
        );
      o.dx = clamp(p.x + active.offset.x - v.x, -2, 2);
      o.dy = clamp(p.y + active.offset.y - v.y, -2, 2);
    } else {
      const dx = q.x - active.last.x,
        dy = q.y - active.last.y;
      state.pan.x = clamp(state.pan.x - dx * 0.4, -0.8, 0.8);
      state.pan.y = clamp(state.pan.y - dy * 0.4, -0.8, 0.8);
    }
    active.last = q;
    render();
  }
  for (const target of [canvas, preview].filter(Boolean)) {
    on(target, "pointerdown", (e) => down(e, target));
    on(target, "pointermove", (e) => move(e, target));
    on(target, "pointerup", (e) => {
      if (active?.id === e.pointerId) {
        move(e, target);
        finish();
      }
    });
    on(target, "pointercancel", finish);
    on(target, "lostpointercapture", () => {
      if (active) {
        active = null;
        render();
      }
    });
    on(target, "blur", finish);
    on(target, "keydown", (e) => {
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        if (e.shiftKey) {
          state.pan.x = clamp(
            state.pan.x +
              (e.key === "ArrowRight"
                ? 0.04
                : e.key === "ArrowLeft"
                  ? -0.04
                  : 0),
            -0.8,
            0.8,
          );
          state.pan.y = clamp(
            state.pan.y +
              (e.key === "ArrowDown" ? 0.04 : e.key === "ArrowUp" ? -0.04 : 0),
            -0.8,
            0.8,
          );
          render();
        } else
          change(
            e.key === "ArrowLeft" || e.key === "ArrowRight"
              ? {
                  rotation: mod(
                    config.rotation + (e.key === "ArrowRight" ? 3 : -3),
                    360,
                  ),
                }
              : {
                  zoom:
                    Math.round(
                      clamp(
                        config.zoom + (e.key === "ArrowUp" ? 0.05 : -0.05),
                        0.6,
                        2.4,
                      ) * 100,
                    ) / 100,
                },
          );
      } else if (e.key === "Escape") finish();
    });
  }
  on(document, "visibilitychange", () => {
    halt();
    if (document.hidden) finish();
    else wake();
  });
  const observer = new IntersectionObserver(
    (es) => {
      visible = es[0].isIntersecting;
      halt();
      if (!visible) finish();
      else wake();
    },
    { threshold: 0.01 },
  );
  observer.observe(canvas);
  const resize = new ResizeObserver(() => render());
  resize.observe(canvas);
  render();
  return {
    update(values) {
      config = options(values);
      finish();
      render();
      halt();
      wake();
    },
    setRunning(v) {
      if (disposed) return;
      running = !!v;
      halt();
      if (!running) finish();
      render();
      wake();
    },
    getState: info,
    getSourceState: () => structuredClone(state),
    rearrange() {
      finish();
      state.seed = (state.seed + 137) >>> 0;
      state.objects = makeObjects(state.seed);
      state.pan = { x: 0, y: 0 };
      render();
    },
    center() {
      state.pan = { x: 0, y: 0 };
      change({ rotation: 0 });
    },
    clear() {
      finish();
      if (state.strokes.length) {
        redo = [structuredClone(state.strokes)];
        state.strokes = [];
      }
      render();
    },
    undo() {
      finish();
      if (state.strokes.length) redo.push([state.strokes.pop()]);
      render();
    },
    redo() {
      finish();
      if (redo.length) state.strokes.push(...redo.pop());
      render();
    },
    replay() {
      finish();
      state.time = { rotation: 0, source: 0 };
      state.pan = { x: 0, y: 0 };
      render();
    },
    setImage(img) {
      if (disposed) return;
      image = captureImage(img);
      imageData = null;
      render();
    },
    serialize() {
      if (image && !imageData) {
        const c = document.createElement("canvas"),
          scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        c.width = Math.round(image.width * scale);
        c.height = Math.round(image.height * scale);
        c.getContext("2d").drawImage(image, 0, 0, c.width, c.height);
        imageData = c.toDataURL("image/jpeg", 0.9);
      }
      return {
        type: "impossible-kaleidoscope",
        version: 1,
        config: { ...config },
        state: structuredClone(state),
        image: imageData,
      };
    },
    restore(document, imageElement = null) {
      const doc = validateDocument(document);
      finish();
      config = doc.config;
      state = doc.state;
      image = imageElement ? captureImage(imageElement) : image;
      imageData = doc.image;
      redo = [];
      render();
      halt();
      wake();
      hooks.change?.({ ...config });
    },
    exportCanvas(size = 2048) {
      const out = document.createElement("canvas");
      out.width = out.height = clamp(Math.round(size), 256, 4096);
      const printSource = document.createElement("canvas");
      printSource.width = printSource.height = Math.min(2048, out.width);
      (hooks.drawSource || paintSource)(printSource, config, state, image);
      if (config.softness > 0) {
        const blurred = document.createElement("canvas");
        blurred.width = blurred.height = Math.max(
          48,
          Math.round(printSource.width / (1 + config.softness * 5)),
        );
        blurred
          .getContext("2d")
          .drawImage(printSource, 0, 0, blurred.width, blurred.height);
        renderOptic(out, blurred, config, state);
        blurred.width = blurred.height = 1;
      } else renderOptic(out, printSource, config, state);
      printSource.width = printSource.height = 1;
      return out;
    },
    dispose() {
      if (disposed) return;
      finish();
      disposed = true;
      running = false;
      halt();
      abort.abort();
      observer.disconnect();
      resize.disconnect();
      source.width =
        source.height =
        soft.width =
        soft.height =
        canvas.width =
        canvas.height =
          1;
      if (preview) preview.width = preview.height = 1;
      state.strokes = [];
      state.objects = [];
      image = null;
      imageData = null;
    },
    get disposed() {
      return disposed;
    },
  };
}
