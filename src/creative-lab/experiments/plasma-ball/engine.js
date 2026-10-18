import { PlasmaField, options, clamp } from "./model.js";
import { createRenderer, layout } from "./renderer.js";
/** Portable canvas effect. Call setRunning(true) after mounting; dispose before removing. */
export function createPlasmaBall(canvas, initial = {}, hooks = {}) {
  if (!canvas.getContext("2d")) throw Error("Canvas 2D is unavailable.");
  const abort = new AbortController(),
    field = new PlasmaField(initial),
    renderer = createRenderer(),
    reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let config = options(initial),
    disposed = false,
    running = false,
    visible = true,
    raf = 0,
    last = 0,
    frames = 0,
    fps = 0,
    reportAt = 0,
    pointer = null;
  const on = (target, type, fn) =>
    target.addEventListener(type, fn, { signal: abort.signal });
  const active = () => running && visible && !document.hidden;
  const evolving = () =>
    config.idle || field.target.amount > 0.001 || field.contact.amount > 0.001;
  function state() {
    return {
      ...field.snapshot(),
      config: { ...config },
      running: active() && evolving(),
      frames,
      fps,
      width: canvas.width,
      height: canvas.height,
      primitives: field.paths.length,
      renderer: "Canvas procedural branches · layered optical glass",
    };
  }
  function draw(force = true) {
    if (disposed) return;
    renderer.draw(canvas, config, field);
    frames++;
    const now = performance.now();
    if (force || now - reportAt > 150) {
      reportAt = now;
      hooks.frame?.(state());
    }
  }
  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect(),
      w = Math.max(
        1,
        Math.min(
          1600,
          Math.round((rect.width || 900) * Math.min(devicePixelRatio || 1, 2)),
        ),
      ),
      h = Math.max(
        1,
        Math.round(
          w * (rect.height && rect.width ? rect.height / rect.width : 0.9),
        ),
      );
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    draw();
  }
  function tick(t) {
    raf = 0;
    if (disposed || !active()) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (dt) fps = fps ? Math.round(fps * 0.92 + 0.08 / dt) : Math.round(1 / dt);
    field.advance(dt);
    draw(false);
    if (evolving()) raf = requestAnimationFrame(tick);
    else {
      last = 0;
      draw();
    }
  }
  function halt() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function wake() {
    if (!disposed && active() && evolving() && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function input(x, y, pressed = false) {
    if (disposed) return;
    field.point(x, y, pressed);
    if (!active()) field.settleInput();
    draw();
    wake();
    hooks.contact?.(state().contact);
  }
  function release() {
    if (disposed) return;
    const old = pointer;
    pointer = null;
    try {
      if (old !== null && canvas.hasPointerCapture(old))
        canvas.releasePointerCapture(old);
    } catch {}
    field.release();
    if (!active()) field.settleInput();
    draw();
    wake();
  }
  function coords(e) {
    const r = canvas.getBoundingClientRect(),
      l = layout(r.width, r.height, config.sphereSize);
    return {
      x: (e.clientX - r.left - l.x) / l.radius,
      y: (e.clientY - r.top - l.y) / l.radius,
    };
  }
  on(canvas, "pointerdown", (e) => {
    if (e.button !== 0 || pointer !== null) return;
    const p = coords(e);
    if (Math.hypot(p.x, p.y) > 1.25) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    pointer = e.pointerId;
    try {
      canvas.setPointerCapture(pointer);
    } catch {}
    input(p.x, p.y, true);
  });
  on(canvas, "pointermove", (e) => {
    if (pointer !== null && pointer !== e.pointerId) return;
    if (e.pointerType === "touch" && pointer === null) return;
    const p = coords(e);
    input(p.x, p.y, pointer !== null);
  });
  on(canvas, "pointerup", (e) => {
    if (pointer !== e.pointerId) return;
    release();
    if (e.pointerType === "mouse") {
      const p = coords(e);
      input(p.x, p.y, false);
    }
  });
  on(canvas, "pointerleave", () => {
    if (pointer === null) release();
  });
  for (const type of ["pointercancel", "lostpointercapture", "blur"])
    on(canvas, type, release);
  on(canvas, "keydown", (e) => {
    const steps = {
      ArrowLeft: [-0.12, 0],
      ArrowRight: [0.12, 0],
      ArrowUp: [0, -0.12],
      ArrowDown: [0, 0.12],
    };
    if (steps[e.key]) {
      e.preventDefault();
      const [x, y] = steps[e.key],
        q = field.target;
      input(
        clamp(q.x + x, -0.95, 0.95),
        clamp(q.y + y, -0.95, 0.95),
        q.pressed,
      );
    }
    if ((e.code === "Space" || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      input(field.target.x, field.target.y, !field.target.pressed);
    }
    if (e.key === "Escape") release();
  });
  on(document, "visibilitychange", () => {
    halt();
    if (document.hidden) release();
    else wake();
  });
  on(reduced, "change", () => {
    if (reduced.matches) {
      running = false;
      halt();
      release();
    }
    hooks.motionPreference?.(reduced.matches);
  });
  const io = new IntersectionObserver(
    (es) => {
      visible = es[0].isIntersecting;
      halt();
      if (!visible) release();
      else wake();
    },
    { threshold: 0.01 },
  );
  io.observe(canvas);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  return {
    field,
    getState: state,
    point: input,
    release,
    update(settings) {
      if (disposed) return;
      config = options(settings);
      field.update(config);
      draw();
      halt();
      wake();
    },
    setRunning(value) {
      if (disposed) return;
      running = !!value;
      halt();
      if (!running) {
        field.settleInput();
        draw();
      } else wake();
    },
    replay() {
      if (disposed) return;
      field.reset();
      draw();
      wake();
    },
    exportCanvas(width = 1800) {
      const out = document.createElement("canvas");
      out.width = clamp(Math.round(width), 320, 2400);
      out.height = Math.round((out.width * canvas.height) / canvas.width);
      renderer.draw(out, config, field);
      return out;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      halt();
      try {
        if (pointer !== null && canvas.hasPointerCapture(pointer))
          canvas.releasePointerCapture(pointer);
      } catch {}
      pointer = null;
      abort.abort();
      io.disconnect();
      ro.disconnect();
      renderer.dispose();
      field.paths = [];
      canvas.width = canvas.height = 1;
    },
    get disposed() {
      return disposed;
    },
  };
}
