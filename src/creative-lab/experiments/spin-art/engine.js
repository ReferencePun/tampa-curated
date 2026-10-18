import { SpinArt } from "./model.js";
import { drawMarks, compositePaper, svgArtwork } from "./paint.js";
import { VIEW, machineBackdrop, drawMachine } from "./renderer.js";
/** Standalone canvas instrument. Caller owns visible/paused state. */
export function createSpinArt(canvas, settings = {}, hooks = {}) {
  const model = new SpinArt(settings),
    g = canvas.getContext("2d"),
    paint = document.createElement("canvas"),
    background = document.createElement("canvas"),
    motion = matchMedia("(prefers-reduced-motion: reduce)"),
    abort = new AbortController();
  if (!g) throw Error("Canvas 2D is unavailable.");
  background.width = 900;
  background.height = 760;
  machineBackdrop(background.getContext("2d"));
  let running = false,
    disposed = false,
    raf = 0,
    last = 0,
    frames = 0,
    fps = 0,
    lastReport = 0,
    pointer = null,
    hover = false,
    cursor = { x: 0.45, y: -0.2 },
    keyboardDown = false;
  const on = (el, type, fn) =>
    el.addEventListener(type, fn, { signal: abort.signal });
  function rebuild() {
    paint.width = paint.height = model.config.paperSize;
    drawMarks(paint.getContext("2d"), model.marks, paint.width, model.hidden);
    model.pending = [];
  }
  function state() {
    return {
      ...model.state(),
      running,
      frames,
      fps,
      width: canvas.width,
      height: canvas.height,
      paperSize: paint.width,
    };
  }
  function flush() {
    const marks = model.drain();
    if (marks.length)
      drawMarks(paint.getContext("2d"), marks, paint.width, model.hidden);
  }
  function render(force = false) {
    if (disposed) return;
    flush();
    const rect = canvas.getBoundingClientRect(),
      dpr = Math.min(2, devicePixelRatio || 1),
      w = Math.round((rect.width || VIEW.width) * dpr),
      h = Math.round((rect.height || VIEW.height) * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    g.setTransform(w / 900, 0, 0, h / 760, 0, 0);
    drawMachine(g, paint, background, model, { cursor, hover });
    frames++;
    const now = performance.now();
    if (force || now - lastReport > 150) {
      lastReport = now;
      hooks.frame?.(state());
    }
  }
  function active() {
    return (
      (model.motor && model.config.speed > 0) ||
      model.pointer.down ||
      model.autoArmed ||
      model.wet.length > 0 ||
      model.spills.some((s) => s.age < 0.16)
    );
  }
  function wake() {
    if (!disposed && running && !document.hidden && active() && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function tick(t) {
    raf = 0;
    if (disposed || !running || document.hidden) return;
    const dt = last ? Math.min(0.08, (t - last) / 1000) : 0;
    last = t;
    if (dt) fps = Math.round(1 / dt);
    model.advance(dt);
    render();
    if (active()) raf = requestAnimationFrame(tick);
    else {
      last = 0;
      render(true);
    }
  }
  function setRunning(value) {
    if (disposed) return;
    running = !!value;
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (!running) {
      model.end();
      keyboardDown = false;
      pointer = null;
    }
    render(true);
    wake();
  }
  function setMotor(value) {
    model.setMotor(value);
    render(true);
    wake();
  }
  function setAuto(value) {
    model.setAuto(value);
    render(true);
    wake();
  }
  function update(next) {
    const old = model.config;
    model.update(next);
    if (old.paperSize !== model.config.paperSize) rebuild();
    render(true);
    wake();
  }
  function clear() {
    const config = { ...model.config, autoDrip: false };
    model.clear();
    model.config = config;
    cursor = { x: 0.45, y: -0.2 };
    keyboardDown = false;
    rebuild();
    render(true);
    hooks.change?.("clear");
  }
  function load(doc) {
    model.load(doc);
    rebuild();
    render(true);
    hooks.change?.("load");
  }
  function undo() {
    model.undo();
    rebuild();
    render(true);
  }
  function redo() {
    model.redo();
    rebuild();
    render(true);
  }
  function begin(x, y, pressure = 1) {
    model.begin(x, y, pressure);
    render(true);
    wake();
  }
  function move(x, y, pressure = 1) {
    cursor = { x, y };
    model.move(x, y, pressure);
    if (model.pointer.down && !running) {
      model.advance(1 / 120);
    }
    render();
    wake();
  }
  function end() {
    model.end();
    keyboardDown = false;
    render(true);
    wake();
  }
  const coordinate = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (((e.clientX - r.left) / r.width) * 900 - VIEW.cx) / VIEW.radius,
      y: (((e.clientY - r.top) / r.height) * 760 - VIEW.cy) / VIEW.radius,
    };
  };
  on(canvas, "pointerdown", (e) => {
    if (e.button !== 0 || pointer !== null) return;
    const p = coordinate(e);
    if (Math.hypot(p.x, p.y) > 1) return;
    e.preventDefault();
    hooks.interact?.();
    canvas.focus({ preventScroll: true });
    pointer = e.pointerId;
    hover = true;
    cursor = p;
    try {
      canvas.setPointerCapture(pointer);
    } catch {}
    begin(p.x, p.y, e.pointerType === "pen" ? e.pressure : 1);
  });
  on(canvas, "pointermove", (e) => {
    if (pointer !== null && e.pointerId !== pointer) return;
    hover = true;
    const p = coordinate(e);
    move(p.x, p.y, e.pointerType === "pen" ? e.pressure : 1);
  });
  const finish = (e) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    end();
    if (canvas.hasPointerCapture?.(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  };
  on(canvas, "pointerup", finish);
  on(canvas, "pointercancel", finish);
  on(canvas, "lostpointercapture", (e) => {
    if (e.pointerId === pointer) {
      pointer = null;
      end();
    }
  });
  on(canvas, "pointerleave", () => {
    hover = false;
    render();
  });
  on(canvas, "keydown", (e) => {
    const dirs = {
      ArrowLeft: [-0.025, 0],
      ArrowRight: [0.025, 0],
      ArrowUp: [0, -0.025],
      ArrowDown: [0, 0.025],
    };
    if (dirs[e.key]) {
      e.preventDefault();
      hooks.interact?.();
      const [dx, dy] = dirs[e.key],
        x = cursor.x + dx * (e.shiftKey ? 3 : 1),
        y = cursor.y + dy * (e.shiftKey ? 3 : 1);
      if (Math.hypot(x, y) < 0.98) move(x, y);
      hover = true;
      render(true);
    } else if (e.code === "Space" && !e.repeat) {
      e.preventDefault();
      hooks.interact?.();
      keyboardDown = !keyboardDown;
      if (keyboardDown) begin(cursor.x, cursor.y);
      else end();
    } else if (e.key === "Escape") {
      pointer = null;
      end();
      canvas.blur();
      hover = false;
      render(true);
    }
  });
  on(canvas, "blur", () => {
    pointer = null;
    end();
  });
  on(document, "visibilitychange", () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (document.hidden) {
      model.end();
      pointer = null;
      keyboardDown = false;
    } else wake();
  });
  on(motion, "change", () => {
    if (motion.matches) {
      model.setMotor(false);
      model.setAuto(false);
      end();
      render(true);
    }
  });
  const resize = new ResizeObserver(() => render(true));
  resize.observe(canvas);
  rebuild();
  if (hooks.document) load(hooks.document);
  if (!motion.matches) model.setMotor(true);
  render(true);
  return {
    model,
    update,
    setRunning,
    setMotor,
    setAuto,
    begin,
    move,
    end,
    clear,
    load,
    undo,
    redo,
    getState: state,
    serialize: () => model.serialize(),
    svg: () => svgArtwork(model.serialize()),
    async png() {
      flush();
      const c = document.createElement("canvas");
      c.width = c.height = paint.width;
      compositePaper(
        c.getContext("2d"),
        paint,
        c.width,
        model.config.paper,
        model.angle,
      );
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      c.width = c.height = 1;
      return blob;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      resize.disconnect();
      abort.abort();
      model.clear();
      paint.width = paint.height = background.width = background.height = 1;
      canvas.width = canvas.height = 1;
    },
    get disposed() {
      return disposed;
    },
  };
}
