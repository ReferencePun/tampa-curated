import { WaterToy, WIDTH, HEIGHT } from "./model.js";
import { drawBackdrop, drawWaterToy } from "./renderer.js";
/** Reusable canvas controller. No Lab imports; caller owns visibility. */
export function createWaterToy(canvas, settings = {}, hooks = {}) {
  const model = new WaterToy(settings, hooks.scene),
    g = canvas.getContext("2d"),
    paper = document.createElement("canvas"),
    motion = matchMedia("(prefers-reduced-motion: reduce)"),
    abort = new AbortController();
  if (!g) throw Error("Canvas 2D is unavailable.");
  paper.width = WIDTH;
  paper.height = HEIGHT;
  let running = false,
    disposed = false,
    raf = 0,
    last = 0,
    frames = 0,
    fps = 0,
    activityUntil = 0;
  function background() {
    (hooks.background ?? drawBackdrop)(paper.getContext("2d"), model);
  }
  function state() {
    return {
      ...model.state(),
      running,
      frames,
      fps,
      width: canvas.width,
      height: canvas.height,
    };
  }
  function draw() {
    if (disposed) return;
    const r = canvas.getBoundingClientRect(),
      dpr = Math.min(2, globalThis.devicePixelRatio || 1),
      w = Math.max(1, Math.round((r.width || WIDTH) * dpr)),
      h = Math.max(1, Math.round((r.height || HEIGHT) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    g.setTransform(w / WIDTH, 0, 0, h / HEIGHT, 0, 0);
    drawWaterToy(g, model, paper, { reduced: motion.matches });
    frames++;
    hooks.frame?.(state());
  }
  function wake() {
    if (!disposed && running && !document.hidden && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function tick(t) {
    raf = 0;
    if (disposed || !running || document.hidden) return;
    const dt = last ? Math.min(0.08, (t - last) / 1000) : 0;
    last = t;
    if (dt > 0) fps = Math.round(1 / dt);
    model.advance(dt);
    for (const e of model.drainEvents()) hooks.event?.(e);
    draw();
    if (
      !motion.matches ||
      model.time < activityUntil ||
      model.challenge === "playing"
    )
      raf = requestAnimationFrame(tick);
    else last = 0;
  }
  function pump(i) {
    if (disposed) return false;
    const accepted = model.pump(i);
    if (accepted) {
      activityUntil = model.time + 15;
      draw();
      wake();
    }
    return accepted;
  }
  function setRunning(value) {
    if (disposed) return;
    running = !!value;
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    draw();
    if (running) wake();
  }
  function reset() {
    if (disposed) return;
    model.reset();
    activityUntil = model.time + 2;
    background();
    draw();
    wake();
  }
  function start() {
    if (disposed) return;
    model.start();
    activityUntil = model.time + 15;
    draw();
    wake();
  }
  function update(next) {
    if (disposed) return;
    const resetState = model.update(next);
    if (resetState) activityUntil = 2;
    background();
    draw();
    wake();
  }
  const observer = new ResizeObserver(draw);
  observer.observe(canvas);
  document.addEventListener(
    "visibilitychange",
    () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      if (!document.hidden) wake();
    },
    { signal: abort.signal },
  );
  motion.addEventListener("change", wake, { signal: abort.signal });
  background();
  draw();
  return {
    model,
    pump,
    start,
    reset,
    update,
    setRunning,
    getState: state,
    png: () => new Promise((resolve) => canvas.toBlob(resolve, "image/png")),
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      abort.abort();
      paper.width = paper.height = 1;
      canvas.width = canvas.height = 1;
    },
    get disposed() {
      return disposed;
    },
  };
}
