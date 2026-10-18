import { FilingsField, WIDTH, HEIGHT, options } from "./model.js";
import { drawFilings, drawMagnet } from "./illustration.js";
export function createMagneticLayer(canvas, settings = {}, hooks = {}) {
  const field = new FilingsField(settings),
    ctx = canvas.getContext("2d"),
    paper = document.createElement("canvas"),
    motion = matchMedia("(prefers-reduced-motion: reduce)"),
    abort = new AbortController();
  if (!ctx) throw Error("Canvas 2D is unavailable.");
  paper.width = WIDTH;
  paper.height = HEIGHT;
  let config = options(settings),
    running = false,
    disposed = false,
    raf = 0,
    last = 0,
    accum = 0,
    frames = 0,
    fps = 0,
    continuous = false,
    latched = false,
    hover = false,
    shakeProgress = 1,
    dirty = true,
    lastStats = 0;
  const on = (el, name, fn) =>
    el.addEventListener(name, fn, { signal: abort.signal });
  function background() {
    const g = paper.getContext("2d");
    g.clearRect(0, 0, WIDTH, HEIGHT);
    if (hooks.background) hooks.background(g, config);
    else {
      g.fillStyle = "#eee6ce";
      g.fillRect(0, 0, WIDTH, HEIGHT);
    }
    dirty = true;
  }
  function stats() {
    return {
      ...field.statistics(),
      frames,
      fps,
      running,
      latched,
      shaking: field.shaking,
      shakeProgress,
    };
  }
  function draw() {
    if (disposed) return;
    const r = canvas.getBoundingClientRect(),
      dpr = Math.min(2, devicePixelRatio || 1),
      w = Math.round((r.width || WIDTH) * dpr),
      h = Math.round((r.height || HEIGHT) * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(w / WIDTH, 0, 0, h / HEIGHT, 0, 0);
    ctx.drawImage(paper, 0, 0);
    hooks.overlay?.(ctx, config);
    drawFilings(ctx, field);
    drawMagnet(ctx, field, !config.hiddenMagnet && (hover || latched));
    frames++;
    dirty = false;
    hooks.frame?.({ ...stats(), width: w, height: h });
  }
  function active() {
    return continuous || field.shaking || field.magnet.down;
  }
  function wake() {
    if (disposed) return;
    dirty = true;
    if (!raf) {
      if (running && !document.hidden && active())
        raf = requestAnimationFrame(tick);
      else draw();
    }
  }
  function tick(now) {
    raf = 0;
    if (disposed || !running || document.hidden) return;
    const dt = last ? Math.min(0.25, (now - last) / 1000) : 0;
    last = now;
    if (dt > 0) fps = Math.round(1 / dt);
    if (field.shaking) {
      shakeProgress = Math.min(
        1,
        shakeProgress + (dt * config.resetSpeed) / 1.15,
      );
      field.shake(shakeProgress);
      hooks.shake?.(shakeProgress);
      dirty = true;
    } else if (field.magnet.down) {
      accum = Math.min(0.08, accum + dt);
      while (accum >= 1 / 120) {
        field.step(1 / 120, motion.matches);
        accum -= 1 / 120;
      }
      dirty = true;
    }
    hooks.tick?.(dt);
    if (dirty || continuous) draw();
    if (now - lastStats > 180) {
      lastStats = now;
      hooks.change?.(stats());
    }
    if (active()) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  function move(x, y, capture = true) {
    field.move(x, y, capture);
    if (!running || motion.matches) field.step(1 / 60, true);
    if (field.magnet.down) hooks.change?.(stats());
    wake();
  }
  function engage() {
    field.engage();
    if (!running || motion.matches) field.step(1 / 60, true);
    hooks.change?.(stats());
    wake();
  }
  function release() {
    field.release();
    latched = false;
    hooks.change?.(stats());
    wake();
  }
  const point = (e) => {
    const b = canvas.getBoundingClientRect();
    return [
      ((e.clientX - b.left) / b.width) * WIDTH,
      ((e.clientY - b.top) / b.height) * HEIGHT,
    ];
  };
  on(canvas, "pointerdown", (e) => {
    if (!e.isPrimary || e.button !== 0 || field.shaking) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    hover = true;
    move(...point(e), false);
    engage();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
  });
  on(canvas, "pointermove", (e) => {
    if (!e.isPrimary || field.shaking) return;
    hover = true;
    move(...point(e));
  });
  on(canvas, "pointerup", () => {
    if (!latched) release();
  });
  on(canvas, "pointercancel", release);
  on(canvas, "lostpointercapture", () => {
    if (!latched) release();
  });
  on(canvas, "pointerleave", (e) => {
    hover = false;
    if (!latched && !canvas.hasPointerCapture?.(e.pointerId)) release();
    else wake();
  });
  on(canvas, "keydown", (e) => {
    if (field.shaking) return;
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (directions[e.key]) {
      e.preventDefault();
      hover = true;
      const d = directions[e.key],
        step = e.shiftKey ? 24 : 9;
      move(field.magnet.x + d[0] * step, field.magnet.y + d[1] * step);
    } else if (e.code === "Space") {
      e.preventDefault();
      latched = !latched;
      if (latched) engage();
      else release();
    } else if (e.key === "Escape") {
      release();
      canvas.blur();
    } else if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      api.loadPinch();
    }
  });
  on(canvas, "blur", () => {
    hover = false;
    release();
  });
  on(document, "visibilitychange", () => {
    if (document.hidden) {
      release();
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    } else wake();
  });
  on(motion, "change", () => {
    if (motion.matches && field.shaking) {
      field.shake(1);
      shakeProgress = 1;
      hooks.shake?.(1);
    }
    wake();
  });
  const observer = new ResizeObserver(() => draw());
  observer.observe(canvas);
  background();
  const api = {
    field,
    draw,
    move,
    engage,
    release,
    setLatched(value) {
      latched = !!value;
      hover = true;
      if (latched) engage();
      else release();
    },
    loadPinch() {
      if (field.shaking) return;
      latched = true;
      hover = true;
      field.loadPinch();
      if (!running || motion.matches) field.step(1 / 60, true);
      hooks.change?.(stats());
      wake();
    },
    setContinuous(v) {
      continuous = !!v;
      wake();
    },
    update(input) {
      config = options({ ...config, ...input });
      field.update(config);
      if (!field.shaking && shakeProgress < 1) {
        shakeProgress = 1;
        hooks.shake?.(1);
      }
      background();
      hooks.change?.(stats());
      wake();
    },
    setRunning(v) {
      running = !!v;
      last = 0;
      accum = 0;
      if (!running) {
        field.release();
        latched = false;
        cancelAnimationFrame(raf);
        raf = 0;
      }
      hooks.change?.(stats());
      wake();
    },
    shake() {
      field.beginShake();
      latched = false;
      shakeProgress = 0;
      if (motion.matches || !running) {
        field.shake(1);
        shakeProgress = 1;
        hooks.shake?.(1);
      }
      hooks.change?.(stats());
      draw();
      wake();
    },
    reset() {
      field.reset();
      latched = false;
      shakeProgress = 1;
      hooks.shake?.(1);
      hooks.change?.(stats());
      draw();
      wake();
    },
    getState: stats,
    serialize: () => field.serialize(),
    load(input) {
      field.load(input);
      config = { ...field.config };
      latched = false;
      shakeProgress = 1;
      hooks.shake?.(1);
      background();
      hooks.change?.(stats());
      draw();
      wake();
      return config;
    },
    png() {
      const c = document.createElement("canvas");
      c.width = WIDTH * 2;
      c.height = HEIGHT * 2;
      const g = c.getContext("2d");
      g.scale(2, 2);
      g.drawImage(paper, 0, 0);
      drawFilings(g, field);
      return new Promise((resolve) => c.toBlob(resolve, "image/png"));
    },
    dispose() {
      disposed = true;
      abort.abort();
      observer.disconnect();
      cancelAnimationFrame(raf);
      field.dispose();
      paper.width = paper.height = 0;
    },
  };
  draw();
  return api;
}
