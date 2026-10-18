import { PrecisionGame, options } from "./model.js";
import { createBoard } from "./board.js";
import { drawBoard, drawGame, viewFor } from "./renderer.js";
/** Canvas adapter. The pure model can also drive another renderer entirely. */
export function createPrecisionToy(canvas, settings = {}, hooks = {}) {
  const g = canvas.getContext("2d");
  if (!g) throw Error("Canvas 2D is unavailable.");
  const bg = document.createElement("canvas"),
    abort = new AbortController(),
    motion = matchMedia("(prefers-reduced-motion: reduce)");
  let config = options(settings),
    seed = 1,
    focus = null,
    running = false,
    disposed = false,
    raf = 0,
    last = 0,
    frames = 0,
    fps = 0,
    lastReport = 0,
    pointer = null,
    anchor = null,
    tool = { x: 0, y: 0, visible: false },
    view;
  const model = new PrecisionGame(
    hooks.scene || createBoard(config, seed),
    config,
    (e) => hooks.event?.(e),
  );
  function rebuild() {
    bg.width = model.scene.width;
    bg.height = model.scene.height;
    (hooks.background || drawBoard)(bg.getContext("2d"), model.scene, config);
    view = viewFor(model.scene, focus);
  }
  function state() {
    return {
      ...model.state(),
      running,
      frames,
      fps,
      width: canvas.width,
      height: canvas.height,
      focus,
      seed,
    };
  }
  function render(force = true) {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect(),
      dpr = Math.min(2, devicePixelRatio || 1),
      w = Math.max(1, Math.round((rect.width || 900) * dpr)),
      h = Math.max(1, Math.round((rect.height || 720) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    g.setTransform(w / model.scene.width, 0, 0, h / model.scene.height, 0, 0);
    drawGame(g, bg, model, view, tool, motion.matches, hooks.piece);
    frames++;
    const t = performance.now();
    if (force || t - lastReport > 100) {
      lastReport = t;
      hooks.frame?.(state());
    }
  }
  function tick(t) {
    raf = 0;
    if (disposed || !running || document.hidden) return;
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
    last = t;
    if (dt) fps = Math.round(1 / dt);
    model.advance(dt);
    if (
      model.flash ||
      model.celebration ||
      model.active !== null ||
      t - lastReport > 100
    )
      render(false);
    if (model.status === "playing" || model.flash || model.celebration)
      raf = requestAnimationFrame(tick);
    else render();
  }
  function wake() {
    if (!disposed && running && !document.hidden && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function cancel() {
    model.end(true);
    if (pointer !== null && canvas.hasPointerCapture?.(pointer))
      canvas.releasePointerCapture(pointer);
    pointer = null;
    anchor = null;
  }
  function setRunning(value) {
    if (disposed) return;
    running = !!value;
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (!running) cancel();
    render();
    wake();
  }
  function reset(shuffle = true) {
    cancel();
    if (shuffle && config.mode === "silly") seed++;
    model.reset(hooks.scene || createBoard(config, seed));
    focus = null;
    tool.visible = false;
    rebuild();
    render();
    wake();
  }
  function update(input) {
    const next = options(input),
      changed = [
        "mode",
        "difficulty",
        "tolerance",
        "timer",
        "objectCount",
        "objectSize",
      ].some((k) => next[k] !== config[k]);
    config = next;
    model.config = config;
    if (changed) reset(false);
    else {
      rebuild();
      render();
    }
  }
  function inspect(id) {
    cancel();
    focus = model.scene.cavities.some((c) => c.id === id) ? id : null;
    const c = model.scene.cavities.find((c) => c.id === focus);
    if (c) tool = { ...c.start, visible: true };
    else tool.visible = false;
    view = viewFor(model.scene, focus);
    render();
  }
  function coordinate(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x:
        (((e.clientX - r.left) / r.width) * model.scene.width - view.x) /
        view.scale,
      y:
        (((e.clientY - r.top) / r.height) * model.scene.height - view.y) /
        view.scale,
    };
  }
  function begin(p) {
    tool = { ...p, visible: true };
    const grabbed = model.begin(p);
    render();
    wake();
    return grabbed;
  }
  function move(p) {
    tool = { ...p, visible: true };
    model.move(p);
    render();
    wake();
  }
  function end(cancelled = false) {
    model.end(cancelled);
    render();
    wake();
  }
  const on = (el, type, fn) =>
    el.addEventListener(type, fn, { signal: abort.signal });
  on(canvas, "pointerdown", (e) => {
    if (e.button !== 0 || pointer !== null) return;
    e.preventDefault();
    hooks.interact?.();
    canvas.focus({ preventScroll: true });
    const p = coordinate(e);
    if (!begin(p)) return;
    pointer = e.pointerId;
    anchor = { raw: p, tool: p };
    try {
      canvas.setPointerCapture(pointer);
    } catch {}
  });
  function sample(e) {
    const p = coordinate(e);
    return anchor
      ? {
          x: anchor.tool.x + (p.x - anchor.raw.x) * config.sensitivity,
          y: anchor.tool.y + (p.y - anchor.raw.y) * config.sensitivity,
        }
      : p;
  }
  on(canvas, "pointermove", (e) => {
    if (pointer !== null && pointer !== e.pointerId) return;
    if (pointer === e.pointerId) {
      const events = e.getCoalescedEvents?.() || [];
      for (const v of events.length ? events : [e]) {
        if (model.active === null) break;
        move(sample(v));
      }
    } else {
      tool = { ...coordinate(e), visible: e.pointerType !== "touch" };
      render();
    }
  });
  function release(e, cancelled) {
    if (e.pointerId !== pointer) return;
    if (!cancelled && model.active !== null) move(sample(e));
    pointer = null;
    anchor = null;
    end(cancelled);
    if (canvas.hasPointerCapture?.(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  }
  on(canvas, "pointerup", (e) => release(e, false));
  on(canvas, "pointercancel", (e) => release(e, true));
  on(canvas, "lostpointercapture", (e) => release(e, true));
  on(canvas, "pointerleave", () => {
    if (pointer === null) {
      tool.visible = false;
      render();
    }
  });
  on(canvas, "keydown", (e) => {
    const dirs = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (dirs[e.key]) {
      e.preventDefault();
      hooks.interact?.();
      const [x, y] = dirs[e.key],
        step = (e.shiftKey ? 0.6 : 2) * config.sensitivity;
      move({ x: tool.x + x * step, y: tool.y + y * step });
    } else if (e.code === "Space" && !e.repeat) {
      e.preventDefault();
      hooks.interact?.();
      if (model.active !== null) end();
      else begin(tool);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      render();
    }
  });
  on(canvas, "blur", () => {
    cancel();
    render();
  });
  on(document, "visibilitychange", () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (document.hidden) {
      cancel();
      hooks.quiet?.();
    } else wake();
    render();
  });
  const resize = new ResizeObserver(() => render());
  resize.observe(canvas);
  rebuild();
  render();
  return {
    model,
    update,
    setRunning,
    reset,
    inspect,
    begin,
    move,
    end,
    getState: state,
    start() {
      model.start();
      render();
      wake();
    },
    exportSettings() {
      return {
        type: "fine-trouble-setup",
        version: 1,
        settings: { ...config, sound: false },
      };
    },
    get view() {
      return { ...view };
    },
    dispose() {
      if (disposed) return;
      cancel();
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      abort.abort();
      resize.disconnect();
      bg.width = bg.height = canvas.width = canvas.height = 1;
    },
    get disposed() {
      return disposed;
    },
  };
}
