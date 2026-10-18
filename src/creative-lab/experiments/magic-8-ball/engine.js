import { ANSWER_SETS, AnswerEngine } from "./answers.js";
import { OrbMotion, ShakeGesture, options, clamp } from "./motion.js";
import { renderOrb, makePlaque } from "./renderer.js";
/** Independent toy engine. Owns one canvas, pointer input and bounded animation state. */
export function createAnswerOrb(canvas, initial = {}, hooks = {}) {
  if (!canvas.getContext("2d")) throw Error("Canvas 2D is unavailable.");
  const sets = hooks.answerSets || ANSWER_SETS,
    selector = new AnswerEngine(initial.seed || 32, sets),
    motion = new OrbMotion(),
    abort = new AbortController(),
    reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let config = options(initial),
    answer = null,
    plaque = makePlaque("Ask, then let go."),
    disposed = false,
    running = false,
    visible = true,
    raf = 0,
    last = 0,
    frames = 0,
    fps = 0,
    reportTime = 0,
    cast = 0,
    pointer = null,
    gesture = null,
    drag = { x: 0, y: 0 },
    light = { x: 0, y: 0 },
    charge = 0,
    history = [],
    lastPhase = "ready";
  if (!sets[config.answerSet]) config.answerSet = Object.keys(sets)[0];
  const on = (el, t, f) => el.addEventListener(t, f, { signal: abort.signal });
  function status() {
    return {
      config: { ...config },
      phase: motion.pose().phase,
      progress: motion.pose().progress,
      clock: motion.elapsed,
      answer: answer && { ...answer },
      history: history.map((a) => ({ ...a })),
      cast,
      charge,
      running: running && visible && !document.hidden,
      frames,
      fps,
      width: canvas.width,
      height: canvas.height,
      primitives: 97,
      renderer: "Canvas glass & suspended answer plaque",
      seed: selector.seed,
    };
  }
  function render(force = true) {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect(),
      w = Math.max(
        1,
        Math.min(
          1600,
          Math.round((rect.width || 900) * Math.min(devicePixelRatio || 1, 2)),
        ),
      ),
      h = Math.round(w * 0.76);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const pose = motion.pose();
    renderOrb(
      canvas,
      config,
      {
        pose,
        viewScale: rect.width < 500 ? 1.28 : 1,
        drag,
        light,
        clock: motion.elapsed,
        charge,
        hasAnswer: !!answer,
        phaseLabel: {
          ready: "ASK. SHAKE. LET IT SETTLE.",
          shaking: "A LITTLE CHAOS, PLEASE.",
          submerged: "THE ANSWER IS SOMEWHERE IN THE DEEP.",
          rising: "SOMETHING IS COMING TO THE SURFACE.",
          settling: "WAIT FOR THE RIPPLE TO PASS.",
          answered: "THERE IT IS. MAKE OF IT WHAT YOU WILL.",
        }[pose.phase],
      },
      plaque,
    );
    frames++;
    const now = performance.now();
    if (force || now - reportTime > 140) {
      reportTime = now;
      hooks.frame?.(status());
    }
    if (pose.phase !== lastPhase) {
      lastPhase = pose.phase;
      hooks.phase?.(pose.phase);
    }
  }
  function finishAnswer() {
    if (!answer || history.some((a) => a.cast === answer.cast)) return;
    history.unshift({ ...answer });
    history = history.slice(0, 6);
    hooks.answer?.({ ...answer });
    render();
  }
  function tick(t) {
    raf = 0;
    if (disposed || !running || !visible || document.hidden) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (dt) fps = fps ? Math.round(fps * 0.9 + 0.1 / dt) : Math.round(1 / dt);
    if (motion.advance(dt, config.revealSpeed, reduced.matches)) finishAnswer();
    if (!gesture) {
      drag.x *= Math.exp(-dt * 10);
      drag.y *= Math.exp(-dt * 10);
      charge *= Math.exp(-dt * 5);
    }
    if (config.autoShake && !motion.busy && motion.idle >= config.interval) {
      shake(hooks.question?.() || "", 1, "automatic");
    }
    render(false);
    if (
      !reduced.matches ||
      motion.busy ||
      config.autoShake ||
      Math.abs(drag.x) + Math.abs(drag.y) > 0.1
    ) {
      if (!raf) raf = requestAnimationFrame(tick);
    } else last = 0;
  }
  function wake() {
    if (
      !disposed &&
      running &&
      visible &&
      !document.hidden &&
      !raf &&
      (!reduced.matches || motion.busy || config.autoShake)
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
  function release() {
    if (pointer !== null) {
      try {
        if (canvas.hasPointerCapture(pointer))
          canvas.releasePointerCapture(pointer);
      } catch {}
    }
    pointer = null;
    gesture = null;
    drag = { x: 0, y: 0 };
    charge = 0;
  }
  function shake(question = "", gestureStrength = 1, origin = "button") {
    if (disposed) return false;
    release();
    answer = {
      ...selector.next(config.answerSet),
      question: String(question).trim().slice(0, 180),
      cast: ++cast,
    };
    const old = plaque;
    plaque = makePlaque(answer.text, answer.setName);
    old.width = old.height = 1;
    motion.shake(config.intensity * gestureStrength);
    hooks.shake?.({ cast, origin, intensity: motion.intensity });
    if (reduced.matches) {
      motion.advance(0.01, config.revealSpeed, true);
      finishAnswer();
    }
    render();
    wake();
    return true;
  }
  function coordinates(e) {
    const r = canvas.getBoundingClientRect();
    const zoom = r.width < 500 ? 1.28 : 1;
    return {
      x: 500 + (((e.clientX - r.left) / r.width) * 1000 - 500) / zoom,
      y: 350 + (((e.clientY - r.top) / r.height) * 760 - 350) / zoom,
    };
  }
  on(canvas, "pointerdown", (e) => {
    if (e.button !== 0 || pointer !== null) return;
    const p = coordinates(e);
    if (Math.hypot(p.x - 500, p.y - 350) > 270) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    hooks.interact?.();
    pointer = e.pointerId;
    gesture = new ShakeGesture(p.x, p.y, e.timeStamp);
    try {
      canvas.setPointerCapture(pointer);
    } catch {}
    render();
  });
  on(canvas, "pointermove", (e) => {
    const p = coordinates(e);
    light = {
      x: clamp((p.x - 500) / 400, -1, 1),
      y: clamp((p.y - 350) / 300, -1, 1),
    };
    if (pointer === e.pointerId && gesture) {
      const samples = e.getCoalescedEvents?.() || [];
      for (const sample of samples) {
        const pt = coordinates(sample);
        gesture.add(pt.x, pt.y, sample.timeStamp);
      }
      charge = gesture.add(p.x, p.y, e.timeStamp);
      drag = {
        x: clamp((p.x - gesture.start.x) * 0.4, -66, 66),
        y: clamp((p.y - gesture.start.y) * 0.3, -40, 40),
      };
    }
    render();
  });
  on(canvas, "pointerup", (e) => {
    if (pointer !== e.pointerId || !gesture) return;
    const strength = gesture.dragged ? gesture.strength : 1;
    shake(hooks.question?.() || "", strength, gesture.dragged ? "drag" : "tap");
  });
  for (const type of ["pointercancel", "lostpointercapture", "blur"])
    on(canvas, type, () => {
      release();
      render();
    });
  on(canvas, "pointerleave", () => {
    if (!gesture) {
      light = { x: 0, y: 0 };
      render();
    }
  });
  on(canvas, "keydown", (e) => {
    if ((e.code === "Space" || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      hooks.interact?.();
      shake(hooks.question?.() || "", 1, "keyboard");
    }
    if (e.key === "Escape") {
      release();
      render();
    }
  });
  on(document, "visibilitychange", () => {
    halt();
    if (document.hidden) {
      release();
      hooks.quiet?.();
    } else wake();
  });
  on(reduced, "change", () => {
    halt();
    if (reduced.matches && motion.busy) {
      motion.advance(0.01, 1, true);
      finishAnswer();
    }
    render();
    wake();
  });
  const io = new IntersectionObserver(
    (es) => {
      visible = es[0].isIntersecting;
      halt();
      if (!visible) {
        release();
        hooks.quiet?.();
      } else wake();
    },
    { threshold: 0.01 },
  );
  io.observe(canvas);
  const ro = new ResizeObserver(() => render());
  ro.observe(canvas);
  render();
  return {
    shake,
    getState: status,
    selector,
    motion,
    update(values) {
      const next = options(values);
      if (!sets[next.answerSet]) next.answerSet = Object.keys(sets)[0];
      if (next.seed !== config.seed) selector.reset(next.seed);
      if (next.autoShake !== config.autoShake) motion.idle = 0;
      config = next;
      render();
      halt();
      wake();
    },
    setRunning(v) {
      if (disposed) return;
      running = !!v;
      halt();
      if (!running) {
        release();
        hooks.quiet?.();
      }
      render();
      wake();
    },
    replay() {
      release();
      motion.reset();
      answer = null;
      history = [];
      cast = 0;
      selector.reset(config.seed);
      plaque.width = plaque.height = 1;
      plaque = makePlaque("Ask, then let go.");
      render();
      wake();
    },
    clearHistory() {
      history = [];
      hooks.history?.([]);
      render();
    },
    exportCanvas(size = 1600) {
      const out = document.createElement("canvas");
      out.width = clamp(Math.round(size), 400, 2400);
      out.height = Math.round(out.width * 0.76);
      renderOrb(
        out,
        config,
        {
          pose: motion.pose(),
          drag: { x: 0, y: 0 },
          light,
          clock: motion.elapsed,
          charge: 0,
          hasAnswer: !!answer,
          phaseLabel:
            answer && motion.pose().phase === "answered"
              ? answer.setName.toUpperCase()
              : "MURMUR / THE QUESTION VESSEL",
        },
        plaque,
      );
      return out;
    },
    dispose() {
      if (disposed) return;
      release();
      disposed = true;
      running = false;
      halt();
      abort.abort();
      io.disconnect();
      ro.disconnect();
      plaque.width = plaque.height = canvas.width = canvas.height = 1;
      answer = null;
      history = [];
    },
    get disposed() {
      return disposed;
    },
  };
}
