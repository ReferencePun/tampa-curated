import { DiscGame, options, clamp } from "./model.js";
import { createArtwork } from "./art.js";
import {
  tableBackground,
  drawTable,
  VIEW,
  unproject,
  project,
} from "./renderer.js";
/** Owns one visible canvas, cached artwork, and direct input. No Lab dependencies. */
export function createDiscTable(canvas, settings = {}, hooks = {}) {
  const g = canvas.getContext("2d");
  if (!g) throw Error("Canvas 2D is unavailable.");
  const bg = document.createElement("canvas"),
    abort = new AbortController();
  bg.width = 1000;
  bg.height = 680;
  const model = new DiscGame(settings, {
    catalog: hooks.catalog,
    stack: hooks.stack,
    event: (e) => hooks.event?.(e),
  });
  let art = createArtwork(model.catalog, model.config.style, hooks.drawDisc),
    input = {
      aim: { x: 12, y: 0 },
      dragging: false,
      power: model.config.power,
    },
    running = false,
    disposed = false,
    raf = 0,
    last = 0,
    frames = 0,
    fps = 0,
    pointer = null,
    gesture = null,
    lastReport = 0;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  function backdrop() {
    (hooks.background || tableBackground)(bg.getContext("2d"), model.config);
  }
  function state() {
    return {
      ...model.state(),
      running,
      frames,
      fps,
      width: canvas.width,
      height: canvas.height,
      aim: { ...input.aim },
      dragging: input.dragging,
      power: input.power,
    };
  }
  function render(force = true) {
    if (disposed) return;
    const r = canvas.getBoundingClientRect(),
      dpr = Math.min(2, devicePixelRatio || 1),
      w = Math.max(1, Math.round((r.width || 1000) * dpr)),
      h = Math.max(1, Math.round((r.height || 680) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    g.setTransform(w / 1000, 0, 0, h / 680, 0, 0);
    drawTable(g, bg, model, art, input);
    frames++;
    const t = performance.now();
    if (force || t - lastReport > 120) {
      lastReport = t;
      hooks.frame?.(state());
    }
  }
  function active() {
    return (
      ["flight", "restack", "thinking"].includes(model.phase) ||
      (model.phase === "result" && model.actor === "cpu")
    );
  }
  function tick(t) {
    raf = 0;
    if (disposed || !running || document.hidden) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (dt) fps = Math.round(1 / dt);
    // Reduced motion resolves flights directly, retaining result inspection and turn pacing.
    if (motion.matches && model.phase === "flight")
      model.advance(model.plan.duration + 0.001);
    else if (motion.matches && model.phase === "restack") model.advance(0.73);
    else model.advance(dt);
    render(false);
    if (active()) raf = requestAnimationFrame(tick);
    else {
      last = 0;
      render();
    }
  }
  function wake() {
    if (!disposed && running && !document.hidden && active() && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function cancel() {
    if (pointer !== null && canvas.hasPointerCapture?.(pointer))
      canvas.releasePointerCapture(pointer);
    pointer = null;
    gesture = null;
    input.dragging = false;
  }
  function setRunning(v) {
    if (disposed) return;
    running = !!v;
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (!running) cancel();
    render();
    wake();
  }
  function strike(shot = { ...input.aim, power: model.config.power }) {
    const ok = model.strike(shot);
    if (ok) {
      input.power = shot.power;
      render();
      wake();
    }
    return ok;
  }
  function collect() {
    const ok = model.collect();
    render();
    wake();
    return ok;
  }
  function reset(ids) {
    cancel();
    model.newRound(ids);
    render();
    wake();
  }
  function update(values) {
    const old = model.config,
      next = options(values),
      restart = old.mode !== next.mode || old.stackSize !== next.stackSize;
    model.config = next;
    if (old.style !== next.style) {
      art.dispose();
      art = createArtwork(model.catalog, next.style, hooks.drawDisc);
      hooks.artwork?.(art);
    }
    if (old.surface !== next.surface) backdrop();
    if (restart) reset();
    else render();
  }
  function aim(p) {
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
      input.aim = { x: clamp(p.x, -280, 280), y: clamp(p.y, -200, 250) };
      render();
      hooks.aim?.(input.aim);
    }
  }
  const on = (el, t, f) => el.addEventListener(t, f, { signal: abort.signal }),
    coordinate = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * 1000,
        y: ((e.clientY - r.top) / r.height) * 680,
      };
    };
  on(canvas, "pointerdown", (e) => {
    if (
      e.button !== 0 ||
      pointer !== null ||
      model.phase !== "ready" ||
      model.actor !== "you"
    )
      return;
    e.preventDefault();
    hooks.interact?.();
    canvas.focus({ preventScroll: true });
    const p = coordinate(e),
      start = project({ ...VIEW.launch, z: 12 });
    if (Math.hypot(p.x - start.x, p.y - start.y) > 80) {
      aim(unproject(p));
      return;
    }
    pointer = e.pointerId;
    input.dragging = true;
    input.power = 0.15;
    gesture = { start: p, last: p, lastTime: e.timeStamp, speed: 0 };
    try {
      canvas.setPointerCapture(pointer);
    } catch {}
    render();
  });
  function sample(e) {
    const p = coordinate(e),
      dt = Math.max(8, e.timeStamp - gesture.lastTime),
      speed = Math.hypot(p.x - gesture.last.x, p.y - gesture.last.y) / dt;
    gesture.speed = gesture.speed * 0.6 + Math.min(3, speed) * 0.4;
    gesture.last = p;
    gesture.lastTime = e.timeStamp;
    input.aim = {
      x: clamp(p.x - 500, -280, 280),
      y: clamp((p.y - 290) / 0.68, -200, 250),
    };
    input.power = clamp(
      0.15 +
        Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) / 400 +
        gesture.speed * 0.12,
      0.15,
      1,
    );
    hooks.aim?.(input.aim);
    render();
  }
  on(canvas, "pointermove", (e) => {
    if (pointer !== e.pointerId || !gesture) return;
    sample(e);
  });
  on(canvas, "pointerup", (e) => {
    if (pointer !== e.pointerId || !gesture) return;
    sample(e);
    const distance = Math.hypot(
        gesture.last.x - gesture.start.x,
        gesture.last.y - gesture.start.y,
      ),
      shot = { ...input.aim, power: input.power };
    cancel();
    if (distance > 22) strike(shot);
    else render();
  });
  on(canvas, "pointercancel", () => {
    cancel();
    render();
  });
  on(canvas, "lostpointercapture", () => {
    if (pointer !== null) {
      cancel();
      render();
    }
  });
  on(canvas, "blur", () => {
    cancel();
    render();
  });
  on(canvas, "keydown", (e) => {
    if (e.code === "Space" || e.key.startsWith("Arrow")) e.preventDefault();
    if (model.phase !== "ready" || model.actor !== "you") return;
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (directions[e.key]) {
      e.preventDefault();
      const [x, y] = directions[e.key],
        step = e.shiftKey ? 2 : 8;
      aim({ x: input.aim.x + x * step, y: input.aim.y + y * step });
    } else if (e.code === "Space" && !e.repeat) {
      e.preventDefault();
      hooks.interact?.();
      strike();
    } else if (e.key === "Escape") {
      cancel();
      render();
    }
  });
  on(document, "visibilitychange", () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (document.hidden) cancel();
    else wake();
  });
  const resize = new ResizeObserver(() => render());
  resize.observe(canvas);
  backdrop();
  render();
  return {
    model,
    update,
    reset,
    strike,
    collect,
    aim,
    setRunning,
    getState: state,
    get artwork() {
      return art;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      cancel();
      cancelAnimationFrame(raf);
      abort.abort();
      resize.disconnect();
      art.dispose();
      bg.width = bg.height = canvas.width = canvas.height = 1;
    },
    get disposed() {
      return disposed;
    },
  };
}
