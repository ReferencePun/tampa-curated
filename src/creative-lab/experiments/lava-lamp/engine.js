import { WaxField, options, clamp } from "./model.js";
import { createLampRenderer } from "./shell.js";
export function createLavaLamp(
  canvas,
  initial = {},
  hooks = {},
  integration = {},
) {
  if (!canvas.getContext("2d")) throw Error("Canvas 2D is unavailable.");
  const field = new WaxField(initial),
    renderer = createLampRenderer(integration),
    abort = new AbortController(),
    motion = matchMedia("(prefers-reduced-motion: reduce)");
  let config = options(initial),
    disposed = false,
    running = false,
    visible = true,
    raf = 0,
    last = 0,
    frames = 0,
    fps = 0,
    reportAt = 0;
  const active = () => running && visible && !document.hidden;
  function state() {
    return {
      ...field.snapshot(),
      config: { ...config },
      running: active(),
      frames,
      fps,
      width: canvas.width,
      height: canvas.height,
      primitives: field.parcels.length,
      renderer: renderer.backend,
    };
  }
  function render(force = true) {
    if (disposed) return;
    renderer.draw(canvas, field, config);
    frames++;
    if (force || performance.now() - reportAt > 180) {
      reportAt = performance.now();
      hooks.frame?.(state());
    }
  }
  function resize() {
    if (disposed) return;
    const r = canvas.getBoundingClientRect(),
      w = Math.min(
        1400,
        Math.max(
          1,
          Math.round((r.width || 900) * Math.min(devicePixelRatio || 1, 1.5)),
        ),
      ),
      h = Math.round(w * (r.height && r.width ? r.height / r.width : 0.9));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    render();
  }
  function halt() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function tick(now) {
    raf = 0;
    if (disposed || !active()) return;
    const dt = last ? Math.min(0.08, (now - last) / 1000) : 0;
    last = now;
    if (dt) fps = fps * 0.9 + 0.1 / dt;
    field.advance(dt);
    render(false);
    raf = requestAnimationFrame(tick);
  }
  function wake() {
    if (!disposed && active() && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      halt();
      wake();
    },
    { signal: abort.signal },
  );
  motion.addEventListener(
    "change",
    () => {
      if (motion.matches) {
        running = false;
        halt();
        render();
      }
      hooks.motionPreference?.(motion.matches);
    },
    { signal: abort.signal },
  );
  const io = new IntersectionObserver(
    (es) => {
      visible = es[0].isIntersecting;
      halt();
      wake();
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
    update(settings) {
      if (disposed) return;
      config = options(settings);
      field.update(config);
      render();
    },
    setRunning(v) {
      if (disposed) return;
      running = !!v;
      halt();
      render();
      wake();
    },
    replay() {
      if (disposed) return;
      field.reset();
      render();
    },
    warmup(seconds = 30) {
      if (disposed) return;
      const steps = Math.round(clamp(seconds, 0, 60) * 60);
      for (let i = 0; i < steps; i++) field.advance(1 / 60);
      render();
    },
    exportCanvas(width = 1800) {
      const out = document.createElement("canvas");
      out.width = clamp(Math.round(width), 320, 2400);
      out.height = Math.round((out.width * canvas.height) / canvas.width);
      renderer.draw(out, field, config);
      return out;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      halt();
      abort.abort();
      io.disconnect();
      ro.disconnect();
      renderer.dispose();
      field.parcels = [];
      canvas.width = canvas.height = 1;
    },
    get disposed() {
      return disposed;
    },
  };
}
